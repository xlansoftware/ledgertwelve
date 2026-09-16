namespace ledger12.Infrastructure.Services;

/// <summary>
/// Configuration for the per-client login rate limit.
/// </summary>
public sealed class LoginRateLimitOptions
{
    public const string SectionName = "LoginRateLimit";

    /// <summary>Number of login attempts a single client may make within <see cref="Window"/>.</summary>
    public int PermitLimit { get; set; } = 10;

    /// <summary>Length of the fixed rate-limit window.</summary>
    public TimeSpan Window { get; set; } = TimeSpan.FromMinutes(5);
}
