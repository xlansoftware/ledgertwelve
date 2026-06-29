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

    // Track book → owner mapping for transaction fallback and share creation
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

    /// <summary>
    /// Represents a connected component of users who shared at least one Space.
    /// </summary>
    private sealed record ConnectedComponent(
        List<string> OldUserIds,      // Old user GUIDs in this component
        bool HasLedgerSpace           // Whether any member has a "Ledger" space
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
            // Phase 2a: Books from non-"Ledger" Spaces
            // ════════════════════════════════════════════════════════════
            Console.WriteLine("Phase 2a/6: Migrating books from non-Ledger spaces...");

            // Discover all spaces to migrate (including "Ledger" spaces)
            var allSpaces = DiscoverSpaces(migratedUserIds);

            // Separate "Ledger" spaces from other spaces
            var ledgerSpaces = allSpaces
                .Where(s => string.Equals(s.Name, "Ledger", StringComparison.OrdinalIgnoreCase))
                .ToList();

            var nonLedgerSpaces = allSpaces
                .Where(s => !string.Equals(s.Name, "Ledger", StringComparison.OrdinalIgnoreCase))
                .ToList();

            // Phase 2a: Create books from non-Ledger spaces
            foreach (var space in nonLedgerSpaces)
            {
                ProcessNonLedgerSpace(space, migratedUserIds);
                summary.BooksCreated++;
            }

            await _db.SaveChangesAsync();

            // ════════════════════════════════════════════════════════════
            // Phase 2b: Main Books from connected components
            // ════════════════════════════════════════════════════════════
            Console.WriteLine("Phase 2b/6: Creating Main books from connected components...");

            var components = ComputeConnectedComponents(allSpaces, migratedUserIds, ledgerSpaces);

            // Build a lookup: which old user IDs are in each component
            var userIdToComponent = new Dictionary<string, ConnectedComponent>(StringComparer.OrdinalIgnoreCase);
            foreach (var component in components)
            {
                foreach (var oldUserId in component.OldUserIds)
                {
                    userIdToComponent[oldUserId] = component;
                }
            }

            // Also track which users have a "Ledger" space
            var usersWithLedgerSpace = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var ls in ledgerSpaces)
            {
                foreach (var memberId in ls.MemberUserIds)
                {
                    usersWithLedgerSpace.Add(memberId);
                }
            }

            foreach (var component in components)
            {
                if (component.OldUserIds.Count >= 2)
                {
                    // Multi-user component: create a shared Main book
                    var oldestUserId = FindOldestUserInComponent(component.OldUserIds, allSpaces);
                    var oldestUserNewId = _ctx.OldUserIdToNewUserId[oldestUserId];

                    var mainBook = new Book(name: "Main", ownerId: oldestUserNewId, currency: "EUR");
                    _db.Books.Add(mainBook);
                    _bookOwnerMap[mainBook.Id] = oldestUserNewId;

                    // Register all "Ledger" spaces in this component to route to this Main book
                    foreach (var ls in ledgerSpaces.Where(s => s.MemberUserIds.Overlaps(component.OldUserIds)))
                    {
                        _ctx.SpaceFileIdToMainBookId[ls.SpaceFileId] = mainBook.Id;
                    }

                    // Record the Main book for all users in the component
                    foreach (var oldUserId in component.OldUserIds)
                    {
                        var newUserId = _ctx.OldUserIdToNewUserId[oldUserId];
                        _ctx.UserToMainBookId[newUserId] = mainBook.Id;
                    }

                    Console.WriteLine($"  Shared Main book: owner={oldestUserId}, members={string.Join(", ", component.OldUserIds)}");
                    summary.BooksCreated++;
                }
                else if (component.OldUserIds.Count == 1)
                {
                    var singleUserId = component.OldUserIds[0];

                    if (usersWithLedgerSpace.Contains(singleUserId))
                    {
                        // Single user with a "Ledger" space: create private Main book
                        var newUserId = _ctx.OldUserIdToNewUserId[singleUserId];

                        var mainBook = new Book(name: "Main", ownerId: newUserId, currency: "EUR");
                        _db.Books.Add(mainBook);
                        _bookOwnerMap[mainBook.Id] = newUserId;

                        // Register this user's "Ledger" spaces to route to this Main book
                        foreach (var ls in ledgerSpaces.Where(s => s.MemberUserIds.Contains(singleUserId)))
                        {
                            _ctx.SpaceFileIdToMainBookId[ls.SpaceFileId] = mainBook.Id;
                        }

                        _ctx.UserToMainBookId[newUserId] = mainBook.Id;

                        Console.WriteLine($"  Private Main book: owner={singleUserId}");
                        summary.BooksCreated++;
                    }
                    else
                    {
                        // Single user with no "Ledger" space: no Main book created (left to EnsureDefaultsAsync)
                        Console.WriteLine($"  No Main book for user {singleUserId} (no Ledger space)");
                    }
                }
            }

            await _db.SaveChangesAsync();

            // Build inverted owner map for Phase 3: ownerId → list of bookIds
            var ownerToBooks = new Dictionary<Guid, List<Guid>>();
            foreach (var (bookId, ownerId) in _bookOwnerMap)
            {
                if (!ownerToBooks.ContainsKey(ownerId))
                    ownerToBooks[ownerId] = new List<Guid>();
                ownerToBooks[ownerId].Add(bookId);
            }

            // ════════════════════════════════════════════════════════════
            // Phase 3: GlobalShares + BookShares
            // ════════════════════════════════════════════════════════════
            Console.WriteLine("Phase 3/6: Creating GlobalShares and BookShares...");

            foreach (var component in components)
            {
                if (component.OldUserIds.Count < 2)
                    continue;

                var newUserIds = component.OldUserIds
                    .Select(id => _ctx.OldUserIdToNewUserId[id])
                    .ToList();

                // Create reciprocal GlobalShare records between all pairs
                foreach (var ownerNewId in newUserIds)
                {
                    foreach (var sharedWithNewId in newUserIds)
                    {
                        if (ownerNewId == sharedWithNewId)
                            continue;

                        var globalShare = DataMapper.ToGlobalShare(ownerNewId, sharedWithNewId);
                        _db.GlobalShares.Add(globalShare);
                        summary.GlobalSharesCreated++;

                        // Create BookShare for every book owned by the sharer
                        if (ownerToBooks.TryGetValue(ownerNewId, out var ownedBookIds))
                        {
                            foreach (var bookId in ownedBookIds)
                            {
                                var bookShare = DataMapper.ToBookShare(bookId, sharedWithNewId);
                                _db.BookShares.Add(bookShare);
                                summary.BookSharesCreated++;
                            }
                        }

                        Console.WriteLine($"  GlobalShare: {ownerNewId} → {sharedWithNewId}");
                    }
                }
            }

            await _db.SaveChangesAsync();

            // Build list of all space sources for categories & transactions (regular + orphan + ledger)
            var allSpaceSources = allSpaces.ToList();

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
                bool isLedgerSpace = string.Equals(space.Name, "Ledger", StringComparison.OrdinalIgnoreCase);

                if (isLedgerSpace)
                {
                    // Route "Ledger" space transactions to the Main book
                    if (!_ctx.SpaceFileIdToMainBookId.TryGetValue(space.SpaceFileId, out bookId))
                    {
                        Console.WriteLine($"  Warning: No Main book registered for Ledger space '{space.Name}' ({space.SpaceFileId}); skipping");
                        continue;
                    }
                }
                else if (space.SpaceGuid is not null)
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

                // For Ledger spaces, the book owner is the Main book owner
                Guid bookOwnerId;
                if (isLedgerSpace)
                {
                    bookOwnerId = _bookOwnerMap[bookId];
                }
                else
                {
                    bookOwnerId = _bookOwnerMap[bookId];
                }

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

                // Check if this user has a Main book (shared or private)
                Guid? currentBookId;
                if (_ctx.UserToMainBookId.TryGetValue(userId, out var mainBookId))
                {
                    // User is in a group with a shared Main, or has a private Main
                    currentBookId = mainBookId;
                }
                else
                {
                    // Resolve old CurrentSpaceId to new Book GUID (existing behavior)
                    if (oldUser.CurrentSpaceId is not null &&
                        _ctx.SpaceGuidToBookId.TryGetValue(oldUser.CurrentSpaceId, out var bookId))
                    {
                        currentBookId = bookId;
                    }
                    else
                    {
                        currentBookId = null;
                    }
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
    /// Discovers all spaces to migrate: those from the Spaces table with migrated members,
    /// including "Ledger" spaces.
    /// </summary>
    private List<SpaceSource> DiscoverSpaces(HashSet<string> migratedUserIds)
    {
        var result = new List<SpaceSource>();

        var allSpaces = _reader.ReadSpaces();
        var allMembers = _reader.ReadSpaceMembers();

        foreach (var oldSpace in allSpaces)
        {
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

    // ─── Non-Ledger space processing (Phase 2a) ───────────────────

    private void ProcessNonLedgerSpace(SpaceSource space, HashSet<string> migratedUserIds)
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
    }

    // ─── Connected Component logic ────────────────────────────────

    /// <summary>
    /// Computes connected components of users based on shared Spaces.
    /// Two users are connected if they share at least one Space.
    /// Both "Ledger" and non-Ledger spaces contribute to connectivity.
    /// </summary>
    private List<ConnectedComponent> ComputeConnectedComponents(
        List<SpaceSource> allSpaces,
        HashSet<string> migratedUserIds,
        List<SpaceSource> ledgerSpaces)
    {
        // Build adjacency list: old user GUID → set of connected old user GUIDs
        var adjacency = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);

        // Initialize for all migrated users
        foreach (var userId in migratedUserIds)
        {
            adjacency[userId] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        }

        // For each space, connect all its migrated members
        foreach (var space in allSpaces)
        {
            var migratedMembers = space.MemberUserIds
                .Where(id => migratedUserIds.Contains(id))
                .ToList();

            foreach (var memberA in migratedMembers)
            {
                foreach (var memberB in migratedMembers)
                {
                    if (!string.Equals(memberA, memberB, StringComparison.OrdinalIgnoreCase))
                    {
                        adjacency[memberA].Add(memberB);
                        adjacency[memberB].Add(memberA);
                    }
                }
            }
        }

        // BFS/DFS to find connected components
        var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var components = new List<ConnectedComponent>();

        foreach (var userId in migratedUserIds)
        {
            if (visited.Contains(userId))
                continue;

            // BFS
            var componentUserIds = new List<string>();
            var queue = new Queue<string>();
            queue.Enqueue(userId);
            visited.Add(userId);

            while (queue.Count > 0)
            {
                var current = queue.Dequeue();
                componentUserIds.Add(current);

                if (adjacency.TryGetValue(current, out var neighbors))
                {
                    foreach (var neighbor in neighbors)
                    {
                        if (!visited.Contains(neighbor))
                        {
                            visited.Add(neighbor);
                            queue.Enqueue(neighbor);
                        }
                    }
                }
            }

            // Determine if this component has any "Ledger" space
            var hasLedgerSpace = ledgerSpaces.Any(ls =>
                ls.MemberUserIds.Overlaps(componentUserIds));

            components.Add(new ConnectedComponent(componentUserIds, hasLedgerSpace));
        }

        return components;
    }

    /// <summary>
    /// Finds the user with the oldest CreatedAt among all Spaces they belong to.
    /// Used to determine shared Main book ownership.
    /// </summary>
    private string FindOldestUserInComponent(List<string> componentUserIds, List<SpaceSource> allSpaces)
    {
        // For each user, find the minimum CreatedAt across all their spaces
        var userToMinCreatedAt = new Dictionary<string, DateTime>(StringComparer.OrdinalIgnoreCase);

        foreach (var userId in componentUserIds)
        {
            var userSpaces = allSpaces
                .Where(s => s.MemberUserIds.Contains(userId))
                .ToList();

            var minCreatedAt = userSpaces
                .Select(s =>
                {
                    if (DateTime.TryParse(s.CreatedAt,
                            System.Globalization.CultureInfo.InvariantCulture,
                            System.Globalization.DateTimeStyles.AssumeUniversal,
                            out var dt))
                        return dt;
                    return DateTime.MaxValue;
                })
                .DefaultIfEmpty(DateTime.MaxValue)
                .Min();

            userToMinCreatedAt[userId] = minCreatedAt;
        }

        // User with the oldest (minimum) CreatedAt wins
        // Ties broken by deterministic sort on user ID
        return componentUserIds
            .OrderBy(id => userToMinCreatedAt[id])
            .ThenBy(id => id, StringComparer.OrdinalIgnoreCase)
            .First();
    }

    public MigrationContext Context => _ctx;
}

public class MigrationSummary
{
    public int UsersMigrated { get; set; }
    public int BooksCreated { get; set; }
    public int GlobalSharesCreated { get; set; }
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
        Console.WriteLine($"  Global shares created:   {GlobalSharesCreated}");
        Console.WriteLine($"  Book shares created:     {BookSharesCreated}");
        Console.WriteLine($"  Categories migrated:     {CategoriesMigrated}");
        Console.WriteLine($"  Transactions migrated:   {TransactionsMigrated}");
        Console.WriteLine($"  User preferences set:    {UserPreferencesMigrated}");
        Console.WriteLine("═══════════════════════════════════════");
    }
}
