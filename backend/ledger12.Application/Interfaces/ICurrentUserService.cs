namespace ledger12.Application.Interfaces;

public interface ICurrentUserService
{
    Guid UserId { get; }

    /// <summary>
    /// Raw user ID string from the NameIdentifier claim, preserving original casing.
    /// Use this for database lookups (UserManager.FindByIdAsync) where SQLite string
    /// comparison is case-sensitive.
    /// </summary>
    string? UserIdString { get; }
}
