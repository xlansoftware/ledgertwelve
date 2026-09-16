using ledger12.Infrastructure.Services;
using Microsoft.Extensions.Options;

namespace ledger12.Tests.Unit.Infrastructure;

public class LoginRateLimiterTests
{
    private static readonly DateTimeOffset Start = new(2025, 1, 1, 12, 0, 0, TimeSpan.Zero);
    private const int MaxAttempts = 3;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(5);

    private sealed class TestTimeProvider(DateTimeOffset now) : TimeProvider
    {
        private DateTimeOffset _now = now;

        public override DateTimeOffset GetUtcNow() => _now;

        public void Advance(TimeSpan delta) => _now = _now.Add(delta);
    }

    private static LoginRateLimiter CreateLimiter(TestTimeProvider clock, int permitLimit = MaxAttempts) =>
        new(
            Options.Create(new LoginRateLimitOptions
            {
                PermitLimit = permitLimit,
                Window = Window
            }),
            clock);

    [Fact]
    public void RegisterAttempt_AllowsAttemptsUpToPermitLimit_WhenWithinWindow()
    {
        var limiter = CreateLimiter(new TestTimeProvider(Start));

        for (var i = 0; i < MaxAttempts; i++)
            Assert.True(limiter.RegisterAttempt("1.2.3.4").IsAllowed);
    }

    [Fact]
    public void RegisterAttempt_RejectsAttempt_WhenPermitLimitExceeded()
    {
        var limiter = CreateLimiter(new TestTimeProvider(Start));

        for (var i = 0; i < MaxAttempts; i++)
            limiter.RegisterAttempt("1.2.3.4");

        var decision = limiter.RegisterAttempt("1.2.3.4");

        Assert.False(decision.IsAllowed);
        Assert.True(decision.RetryAfter > TimeSpan.Zero);
        Assert.True(decision.RetryAfter <= Window);
    }

    [Fact]
    public void RegisterAttempt_AllowsAgain_WhenWindowElapses()
    {
        var clock = new TestTimeProvider(Start);
        var limiter = CreateLimiter(clock, permitLimit: 2);

        Assert.True(limiter.RegisterAttempt("1.2.3.4").IsAllowed);
        Assert.True(limiter.RegisterAttempt("1.2.3.4").IsAllowed);
        Assert.False(limiter.RegisterAttempt("1.2.3.4").IsAllowed);

        clock.Advance(Window);

        Assert.True(limiter.RegisterAttempt("1.2.3.4").IsAllowed);
    }

    [Fact]
    public void RegisterAttempt_ResetsCount_WhenWindowElapsesWithNoAttempts()
    {
        var clock = new TestTimeProvider(Start);
        var limiter = CreateLimiter(clock, permitLimit: 2);

        limiter.RegisterAttempt("1.2.3.4");
        clock.Advance(Window);

        Assert.True(limiter.RegisterAttempt("1.2.3.4").IsAllowed);
        Assert.True(limiter.RegisterAttempt("1.2.3.4").IsAllowed);
        Assert.False(limiter.RegisterAttempt("1.2.3.4").IsAllowed);
    }

    [Fact]
    public void RegisterAttempt_TracksClientsIndependently_WhenClientKeysDiffer()
    {
        var limiter = CreateLimiter(new TestTimeProvider(Start), permitLimit: 1);

        Assert.True(limiter.RegisterAttempt("1.2.3.4").IsAllowed);
        Assert.False(limiter.RegisterAttempt("1.2.3.4").IsAllowed);
        Assert.True(limiter.RegisterAttempt("5.6.7.8").IsAllowed);
    }

    [Fact]
    public void RegisterAttempt_AppliesSharedLimit_WhenClientKeyIsBlank()
    {
        var limiter = CreateLimiter(new TestTimeProvider(Start), permitLimit: 1);

        Assert.True(limiter.RegisterAttempt(string.Empty).IsAllowed);
        Assert.False(limiter.RegisterAttempt(string.Empty).IsAllowed);
        Assert.False(limiter.RegisterAttempt("   ").IsAllowed);
    }
}
