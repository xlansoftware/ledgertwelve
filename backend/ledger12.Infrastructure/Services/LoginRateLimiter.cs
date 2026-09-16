using System.Collections.Concurrent;
using ledger12.Application.Interfaces;
using Microsoft.Extensions.Options;

namespace ledger12.Infrastructure.Services;

/// <summary>
/// Fixed-window, in-memory login throttle keyed by client (typically the originating IP).
/// A client may make <see cref="LoginRateLimitOptions.PermitLimit"/> attempts per
/// <see cref="LoginRateLimitOptions.Window"/> before further attempts are rejected until
/// the window resets. Expired windows are swept periodically to bound memory usage.
/// </summary>
public sealed class LoginRateLimiter : ILoginRateLimiter
{
    private readonly ConcurrentDictionary<string, AttemptWindow> _windows = new(StringComparer.Ordinal);
    private readonly LoginRateLimitOptions _options;
    private readonly TimeProvider _timeProvider;
    private long _nextSweepTicks;

    public LoginRateLimiter(IOptions<LoginRateLimitOptions> options, TimeProvider timeProvider)
    {
        _options = options.Value;
        _timeProvider = timeProvider;
    }

    public LoginRateLimitDecision RegisterAttempt(string clientKey)
    {
        var key = string.IsNullOrWhiteSpace(clientKey) ? "unknown" : clientKey;
        var now = _timeProvider.GetUtcNow();

        SweepExpiredWindows(now);

        var window = _windows.GetOrAdd(key, _ => new AttemptWindow(now.Add(_options.Window)));

        lock (window)
        {
            if (now >= window.ResetAt)
            {
                window.Count = 0;
                window.ResetAt = now.Add(_options.Window);
            }

            window.Count++;

            return window.Count > _options.PermitLimit
                ? new LoginRateLimitDecision(false, window.ResetAt - now)
                : new LoginRateLimitDecision(true, TimeSpan.Zero);
        }
    }

    private void SweepExpiredWindows(DateTimeOffset now)
    {
        var scheduled = Interlocked.Read(ref _nextSweepTicks);
        if (now.UtcTicks < scheduled)
            return;

        // Only the thread that moves the schedule forward performs the sweep.
        if (Interlocked.CompareExchange(ref _nextSweepTicks, now.Add(_options.Window).UtcTicks, scheduled) != scheduled)
            return;

        foreach (var entry in _windows)
        {
            bool expired;
            lock (entry.Value)
            {
                expired = now >= entry.Value.ResetAt;
            }

            if (expired)
                _windows.TryRemove(entry.Key, out _);
        }
    }

    private sealed class AttemptWindow(DateTimeOffset resetAt)
    {
        public int Count { get; set; }

        public DateTimeOffset ResetAt { get; set; } = resetAt;
    }
}
