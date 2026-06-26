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

            // ════════════════════════════════════════════════════════════
            // Phase 2: Books
            // ════════════════════════════════════════════════════════════
            Console.WriteLine("Phase 2/6: Migrating books...");
            var allSpaces = _reader.ReadSpaces();
            var allMembers = _reader.ReadSpaceMembers();

            // Determine which spaces to migrate:
            // - Must have at least one migrated user as a member
            // - Skip dead spaces (no members, no transactions)
            var migratedUserIds = migratedUsers.Select(u => u.Id).ToHashSet(StringComparer.OrdinalIgnoreCase);

            foreach (var oldSpace in allSpaces)
            {
                var spaceMembers = allMembers.Where(m =>
                    m.SpaceId.Equals(oldSpace.Id, StringComparison.OrdinalIgnoreCase)).ToList();

                var migratedMemberIds = spaceMembers
                    .Select(m => m.UserId)
                    .Where(id => migratedUserIds.Contains(id))
                    .ToList();

                // Skip spaces with no migrated members
                if (migratedMemberIds.Count == 0)
                {
                    Console.WriteLine($"  Skipping space '{oldSpace.Name}' ({oldSpace.Id}): no migrated members");
                    continue;
                }

                // Determine owner
                Guid ownerId;
                if (migratedUserIds.Contains(oldSpace.CreatedByUserId))
                {
                    // Original creator is a migrated user
                    ownerId = _ctx.OldUserIdToNewUserId[oldSpace.CreatedByUserId];
                }
                else
                {
                    // Orphan space: assign first migrated SpaceMember as owner
                    var firstMemberId = spaceMembers
                        .First(m => migratedUserIds.Contains(m.UserId)).UserId;
                    ownerId = _ctx.OldUserIdToNewUserId[firstMemberId];
                    Console.WriteLine($"  Orphan space '{oldSpace.Name}': assigning owner {firstMemberId}");
                }

                var (book, spaceFileId) = DataMapper.ToBook(oldSpace, ownerId, _ctx);
                _db.Books.Add(book);
                _bookOwnerMap[book.Id] = ownerId;
                summary.BooksCreated++;
                Console.WriteLine($"  Book: '{book.Name}' ({book.Id}), owner={ownerId}");
            }

            await _db.SaveChangesAsync();

            // ════════════════════════════════════════════════════════════
            // Phase 3: Book Shares
            // ════════════════════════════════════════════════════════════
            Console.WriteLine("Phase 3/6: Migrating book shares...");
            var migratedSpaces = allSpaces
                .Where(s => _ctx.SpaceGuidToBookId.ContainsKey(s.Id))
                .ToList();

            foreach (var oldSpace in migratedSpaces)
            {
                var bookId = _ctx.SpaceGuidToBookId[oldSpace.Id];
                var spaceMembers = allMembers
                    .Where(m => m.SpaceId.Equals(oldSpace.Id, StringComparison.OrdinalIgnoreCase))
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

            // ════════════════════════════════════════════════════════════
            // Phase 4: Categories
            // ════════════════════════════════════════════════════════════
            Console.WriteLine("Phase 4/6: Migrating categories...");
            foreach (var oldSpace in migratedSpaces)
            {
                var spaceFileId = OldDatabaseReader.GetSpaceFileId(oldSpace.Id);
                var spaceDbPath = OldDatabaseReader.GetSpaceDbPath(_dataDir, oldSpace.Id);

                if (!File.Exists(spaceDbPath))
                {
                    Console.WriteLine($"  Warning: space DB not found: {spaceDbPath}");
                    continue;
                }

                var oldCategories = _reader.ReadCategories(spaceDbPath);
                var spaceMembers = allMembers
                    .Where(m => m.SpaceId.Equals(oldSpace.Id, StringComparison.OrdinalIgnoreCase))
                    .Where(m => _ctx.OldUserIdToNewUserId.ContainsKey(m.UserId))
                    .ToList();

                foreach (var member in spaceMembers)
                {
                    var userId = _ctx.OldUserIdToNewUserId[member.UserId];

                    foreach (var oldCategory in oldCategories)
                    {
                        var category = DataMapper.ToCategory(oldCategory, userId, spaceFileId, _ctx);
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
            foreach (var oldSpace in migratedSpaces)
            {
                var bookId = _ctx.SpaceGuidToBookId[oldSpace.Id];
                var spaceFileId = OldDatabaseReader.GetSpaceFileId(oldSpace.Id);
                var spaceDbPath = OldDatabaseReader.GetSpaceDbPath(_dataDir, oldSpace.Id);

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
                        var key = (spaceFileId, oldTransaction.CategoryId.Value);
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
