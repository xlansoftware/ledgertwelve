namespace ledger12.MigrateFromLedger11;

/// <summary>
/// In-memory state holding mapping registries built during migration.
/// </summary>
public class MigrationContext
{
    /// <summary>Maps old user email → new user GUID.</summary>
    public Dictionary<string, Guid> EmailToUserId { get; } = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Maps old user GUID (from AspNetUsers.Id) → new user GUID.</summary>
    public Dictionary<string, Guid> OldUserIdToNewUserId { get; } = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Maps old Space GUID → new Book GUID.</summary>
    public Dictionary<string, Guid> SpaceGuidToBookId { get; } = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Maps old space database file ID (lowercase space GUID) → new Book GUID.</summary>
    public Dictionary<string, Guid> SpaceFileIdToBookId { get; } = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Maps (userId, categoryName) to the created Category for deduplication.</summary>
    public Dictionary<(Guid UserId, string Name), Guid> UserCategoryLookup { get; } = new();

    /// <summary>
    /// Maps (spaceFileId, oldCategoryIntId) → category name for resolving transaction category references.
    /// </summary>
    public Dictionary<(string SpaceFileId, int OldCategoryId), string> CategoryIdToName { get; } = new();
}
