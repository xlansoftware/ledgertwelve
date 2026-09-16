namespace ledger12.Application.Interfaces;

/// <summary>
/// Throttles login attempts per client (typically the originating IP address) so a
/// single client cannot brute-force credentials.
/// </summary>
public interface ILoginRateLimiter
{
    /// <summary>
    /// Registers one login attempt for the supplied client key and reports whether it is allowed.
    /// </summary>
    LoginRateLimitDecision RegisterAttempt(string clientKey);
}

/// <summary>
/// Outcome of a login attempt against the per-client rate limit.
/// </summary>
public readonly record struct LoginRateLimitDecision(bool IsAllowed, TimeSpan RetryAfter);
