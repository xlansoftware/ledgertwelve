using ledger12.Domain.Entities;
using ledger12.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ledger12.MigrateFromLedger11;

/// <summary>
/// Coordinates the migration in strict phase order.
/// Runs inside a single database transaction (all-or-nothing).
/// </summary>
public class MigrationEngine
{
    private readonly string _dataDir;
    private readonly AppDbContext _db;
    private readonly OldDatabaseReader _reader;
    private readonly MigrationContext _ctx;

    // Track book → owner mapping for transaction fallback
    private readonly Dictionary<Guid, Guid> _bookOwnerMap = new();

    public MigrationEngine(string dataDir, AppDbContext db)
    {
        _dataDir = dataDir;
        _db = db;
        _reader = new OldDatabaseReader(Path.Combine(dataDir, "appdata.db"));
        _ctx = new MigrationContext();
    }

    /// <summary>
    /// Unified description of a space to migrate, whether it has a Spaces row or is an orphan DB file.
    /// </summary>
    private sealed record SpaceSource(
        string? SpaceGuid,       // GUID from Spaces table (null for orphans)
        string SpaceFileId,      // Lowercase hex file ID
        string Name,             // Display name
        string? Currency,
        string CreatedAt,
        HashSet<string> MemberUserIds  // User GUIDs that are members of this space
    );

    public async Task<MigrationSummary> RunAsync()
    {
        var summary = new MigrationSummary();

        using var txn = await _db.Database.BeginTransactionAsync();

        try
        {
            // ════════════════════════════════════════════════════════════
            // Phase 1: Users
            // ════════════════════════════════════════════════════════════
            Console.WriteLine("Phase 1/6: Migrating users...");
            var allUsers = _reader.ReadUsers();
            var migratedUsers = allUsers
                .Where(u => !string.IsNullOrEmpty(u.PasswordHash))
                .ToList();

            foreach (var oldUser in migratedUsers)
            {
                var appUser = DataMapper.ToAppUser(oldUser, _ctx);
                _db.Users.Add(appUser);
                summary.UsersMigrated++;
                Console.WriteLine($"  User: {oldUser.Email} ({oldUser.Id})");
            }

            await _db.SaveChangesAsync();

            // Build set of migrated user GUIDs (original old IDs)
            var migratedUserIds = migratedUsers
                .Select(u => u.Id)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            // ════════════════════════════════════════════════════════════
            // Phase 2: Books — migrate from Spaces table only (no orphan DBs)
            // ════════════════════════════════════════════════════════════
            Console.WriteLine("Phase 2/6: Migrating books...");

            // Discover all spaces to migrate
            var spacesToMigrate = DiscoverSpaces(migratedUserIds);

            foreach (var space in spacesToMigrate)
            {
                // Determine owner
                Guid ownerId;

                if (space.SpaceGuid is not null)
                {
                    // Regular space from Spaces table
                    var oldSpace = _reader.ReadSpaces()
                        .First(s => s.Id.Equals(space.SpaceGuid, StringComparison.OrdinalIgnoreCase));

                    if (migratedUserIds.Contains(oldSpace.CreatedByUserId))
                    {
                        ownerId = _ctx.OldUserIdToNewUserId[oldSpace.CreatedByUserId];
                    }
                    else
                    {
                        // Orphan space in Spaces table (no valid creator): assign first migrated member
                        var firstMemberId = space.MemberUserIds
                            .First(id => migratedUserIds.Contains(id));
                        ownerId = _ctx.OldUserIdToNewUserId[firstMemberId];
                        Console.WriteLine($"  Orphan space '{space.Name}': assigning owner {firstMemberId}");
                    }

                    var (book, _) = DataMapper.ToBook(oldSpace, ownerId, _ctx);

                    // Apply space settings: close book if Status is Closed
                    var spaceDbPath = Path.Combine(_dataDir, $"space-{space.SpaceFileId}.db");
                    if (File.Exists(spaceDbPath))
                    {
                        var settings = _reader.ReadSettings(spaceDbPath);
                        if (settings.TryGetValue("Status", out var status) &&
                            string.Equals(status, "Closed", StringComparison.OrdinalIgnoreCase))
                        {
                            book.Close(DateTimeOffset.UtcNow);
                        }
                    }

                    _db.Books.Add(book);
                    _bookOwnerMap[book.Id] = ownerId;
                    Console.WriteLine($"  Book: '{book.Name}' ({book.Id}), owner={ownerId}");
                }
                else
                {
                    // Orphan DB file — no Spaces row
                    // Determine owner: most frequent migrated user among transaction authors
                    var spaceDbPath = Path.Combine(_dataDir, $"space-{space.SpaceFileId}.db");
                    var transactions = _reader.ReadTransactions(spaceDbPath);
                    var userFreq = transactions
                        .Where(t => t.User is not null)
                        .GroupBy(t => t.User!)
                        .ToDictionary(g => g.Key, g => g.Count());

                    var bestEmail = userFreq
                        .Where(kv => _ctx.EmailToUserId.ContainsKey(kv.Key))
                        .OrderByDescending(kv => kv.Value)
                        .Select(kv => kv.Key)
                        .FirstOrDefault();

                    Guid orphanOwnerId;
                    if (bestEmail is not null && _ctx.EmailToUserId.TryGetValue(bestEmail, out var resolvedOwner))
                    {
                        orphanOwnerId = resolvedOwner;
                    }
                    else
                    {
                        // Fallback: first migrated member (if any)
                        var fallbackMember = space.MemberUserIds
                            .FirstOrDefault(id => migratedUserIds.Contains(id));
                        orphanOwnerId = fallbackMember is not null
                            ? _ctx.OldUserIdToNewUserId[fallbackMember]
                            : migratedUserIds.Select(id => _ctx.OldUserIdToNewUserId[id]).First();
                    }

                    // Create book with generated GUID (no old SpaceGuid to preserve)
                    var book = new Book(
                        name: space.Name,
                        ownerId: orphanOwnerId,
                        currency: space.Currency
                    );

                    // Apply space settings: close book if Status is Closed
                    if (File.Exists(spaceDbPath))
                    {
                        var settings = _reader.ReadSettings(spaceDbPath);
                        if (settings.TryGetValue("Status", out var status) &&
                            string.Equals(status, "Closed", StringComparison.OrdinalIgnoreCase))
                        {
                            book.Close(DateTimeOffset.UtcNow);
                        }
                    }

                    _db.Books.Add(book);
                    _bookOwnerMap[book.Id] = orphanOwnerId;
                    _ctx.SpaceFileIdToBookId[space.SpaceFileId] = book.Id;
                    Console.WriteLine($"  Book: '{book.Name}' ({book.Id}), owner={orphanOwnerId} (orphan DB)");
                }

                summary.BooksCreated++;
            }

            await _db.SaveChangesAsync();

            // ════════════════════════════════════════════════════════════
            // Phase 3: Book Shares (regular spaces only — orphans have no members table)
            // ════════════════════════════════════════════════════════════
            Console.WriteLine("Phase 3/6: Migrating book shares...");
            var allMembers = _reader.ReadSpaceMembers();
            var migratedSpaces = spacesToMigrate
                .Where(s => s.SpaceGuid is not null)
                .ToList();

            foreach (var space in migratedSpaces)
            {
                var bookId = _ctx.SpaceGuidToBookId[space.SpaceGuid!];
                var spaceMembers = allMembers
                    .Where(m => m.SpaceId.Equals(space.SpaceGuid!, StringComparison.OrdinalIgnoreCase))
                    .ToList();

                foreach (var member in spaceMembers)
                {
                    // Skip members whose users were not migrated
                    if (!_ctx.OldUserIdToNewUserId.TryGetValue(member.UserId, out var memberUserId))
                        continue;

                    // Skip the book owner — they don't need a share
                    if (_bookOwnerMap.TryGetValue(bookId, out var ownerId) && memberUserId == ownerId)
                        continue;

                    var share = DataMapper.ToBookShare(bookId, memberUserId);
                    _db.BookShares.Add(share);
                    summary.BookSharesCreated++;
                    Console.WriteLine($"  Share: book={bookId}, user={memberUserId}");
                }
            }

            await _db.SaveChangesAsync();

            // Build list of all space sources for categories & transactions (regular + orphan)
            var allSpaceSources = spacesToMigrate.ToList();

            // ════════════════════════════════════════════════════════════
            // Phase 4: Categories
            // ════════════════════════════════════════════════════════════
            Console.WriteLine("Phase 4/6: Migrating categories...");
            foreach (var space in allSpaceSources)
            {
                var spaceDbPath = Path.Combine(_dataDir, $"space-{space.SpaceFileId}.db");

                if (!File.Exists(spaceDbPath))
                {
                    Console.WriteLine($"  Warning: space DB not found: {spaceDbPath}");
                    continue;
                }

                var oldCategories = _reader.ReadCategories(spaceDbPath);

                // For regular spaces: categories for each member; for orphans: categories for the owner
                var memberUserIds = space.MemberUserIds
                    .Where(id => _ctx.OldUserIdToNewUserId.ContainsKey(id))
                    .Select(id => _ctx.OldUserIdToNewUserId[id])
                    .ToHashSet();

                if (memberUserIds.Count == 0 && space.SpaceGuid is null)
                {
                    // Orphan — get owner from the book
                    var orphanBookId = _ctx.SpaceFileIdToBookId[space.SpaceFileId];
                    memberUserIds = new HashSet<Guid> { _bookOwnerMap[orphanBookId] };
                }

                foreach (var userId in memberUserIds)
                {
                    foreach (var oldCategory in oldCategories)
                    {
                        var category = DataMapper.ToCategory(oldCategory, userId, space.SpaceFileId, _ctx);
                        if (category is not null)
                        {
                            _db.Categories.Add(category);
                            summary.CategoriesMigrated++;
                        }
                    }
                }
            }

            await _db.SaveChangesAsync();

            // ════════════════════════════════════════════════════════════
            // Phase 5: Transactions
            // ════════════════════════════════════════════════════════════
            Console.WriteLine("Phase 5/6: Migrating transactions...");
            foreach (var space in allSpaceSources)
            {
                Guid bookId;
                if (space.SpaceGuid is not null)
                {
                    bookId = _ctx.SpaceGuidToBookId[space.SpaceGuid];
                }
                else
                {
                    bookId = _ctx.SpaceFileIdToBookId[space.SpaceFileId];
                }

                var spaceDbPath = Path.Combine(_dataDir, $"space-{space.SpaceFileId}.db");

                if (!File.Exists(spaceDbPath))
                {
                    Console.WriteLine($"  Warning: space DB not found: {spaceDbPath}");
                    continue;
                }

                var bookOwnerId = _bookOwnerMap[bookId];
                var oldTransactions = _reader.ReadTransactions(spaceDbPath);

                foreach (var oldTransaction in oldTransactions)
                {
                    // Resolve user email to GUID, fallback to book owner
                    Guid userId;
                    if (oldTransaction.User is not null &&
                        _ctx.EmailToUserId.TryGetValue(oldTransaction.User, out var resolvedUserId))
                    {
                        userId = resolvedUserId;
                    }
                    else
                    {
                        userId = bookOwnerId;
                    }

                    // Resolve category int ID to name
                    string? categoryName = null;
                    if (oldTransaction.CategoryId.HasValue)
                    {
                        var key = (space.SpaceFileId, oldTransaction.CategoryId.Value);
                        if (_ctx.CategoryIdToName.TryGetValue(key, out var name))
                        {
                            categoryName = name;
                        }
                    }

                    var transaction = DataMapper.ToTransaction(
                        oldTransaction, bookId, userId, categoryName, _ctx);

                    if (transaction is not null)
                    {
                        _db.Transactions.Add(transaction);
                        summary.TransactionsMigrated++;
                    }
                }
            }

            await _db.SaveChangesAsync();

            // ════════════════════════════════════════════════════════════
            // Phase 6: User Preferences
            // ════════════════════════════════════════════════════════════
            Console.WriteLine("Phase 6/6: Migrating user preferences...");
            foreach (var oldUser in migratedUsers)
            {
                var userId = _ctx.OldUserIdToNewUserId[oldUser.Id];

                // Resolve old CurrentSpaceId to new Book GUID
                Guid? currentBookId = null;
                if (oldUser.CurrentSpaceId is not null &&
                    _ctx.SpaceGuidToBookId.TryGetValue(oldUser.CurrentSpaceId, out var bookId))
                {
                    currentBookId = bookId;
                }

                var pref = DataMapper.ToUserPreference(userId, currentBookId);
                _db.UserPreferences.Add(pref);
                summary.UserPreferencesMigrated++;
                Console.WriteLine($"  Preference: user={userId}, currentBook={currentBookId}");
            }

            await _db.SaveChangesAsync();

            // ─── Commit ────────────────────────────────────────────────
            await txn.CommitAsync();
            Console.WriteLine("\nMigration completed successfully!");
        }
        catch
        {
            await txn.RollbackAsync();
            Console.Error.WriteLine("\nMigration failed. Transaction rolled back.");
            throw;
        }

        return summary;
    }

    // ─── Space discovery ──────────────────────────────────────────

    /// <summary>
    /// Discovers all spaces to migrate: those from the Spaces table with migrated members.
    /// Orphan space DB files (no Spaces row) are not migrated.
    /// </summary>
    private List<SpaceSource> DiscoverSpaces(HashSet<string> migratedUserIds)
    {
        var result = new List<SpaceSource>();

        // 1. Collect all space GUIDs that have a Spaces row
        var allSpaces = _reader.ReadSpaces();
        var allMembers = _reader.ReadSpaceMembers();
        var knownSpaceIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var oldSpace in allSpaces)
        {
            knownSpaceIds.Add(oldSpace.Id);

            var spaceMembers = allMembers
                .Where(m => m.SpaceId.Equals(oldSpace.Id, StringComparison.OrdinalIgnoreCase))
                .ToList();

            var memberUserIds = spaceMembers
                .Select(m => m.UserId)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var migratedMemberIds = memberUserIds
                .Where(id => migratedUserIds.Contains(id))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            // Skip spaces with no migrated members
            if (migratedMemberIds.Count == 0)
            {
                Console.WriteLine($"  Skipping space '{oldSpace.Name}' ({oldSpace.Id}): no migrated members");
                continue;
            }

            result.Add(new SpaceSource(
                SpaceGuid: oldSpace.Id,
                SpaceFileId: OldDatabaseReader.GetSpaceFileId(oldSpace.Id),
                Name: oldSpace.Name,
                Currency: oldSpace.Currency,
                CreatedAt: oldSpace.CreatedAt,
                MemberUserIds: memberUserIds
            ));

            Console.WriteLine($"  Queued space: '{oldSpace.Name}' ({oldSpace.Id})");
        }

        return result;
    }

    public MigrationContext Context => _ctx;
}

public class MigrationSummary
{
    public int UsersMigrated { get; set; }
    public int BooksCreated { get; set; }
    public int BookSharesCreated { get; set; }
    public int CategoriesMigrated { get; set; }
    public int TransactionsMigrated { get; set; }
    public int UserPreferencesMigrated { get; set; }

    public void Print()
    {
        Console.WriteLine("\n═══════════════════════════════════════");
        Console.WriteLine("         Migration Summary");
        Console.WriteLine("═══════════════════════════════════════");
        Console.WriteLine($"  Users migrated:          {UsersMigrated}");
        Console.WriteLine($"  Books created:           {BooksCreated}");
        Console.WriteLine($"  Book shares created:     {BookSharesCreated}");
        Console.WriteLine($"  Categories migrated:     {CategoriesMigrated}");
        Console.WriteLine($"  Transactions migrated:   {TransactionsMigrated}");
        Console.WriteLine($"  User preferences set:    {UserPreferencesMigrated}");
        Console.WriteLine("═══════════════════════════════════════");
    }
}
