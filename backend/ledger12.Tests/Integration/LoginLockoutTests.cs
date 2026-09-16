using ledger12.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ledger12.Tests.Integration;

public class LoginLockoutTests
{
    private const string Email = "lockout@example.com";
    private const string Password = "Correct-Password1";
    private const string WrongPassword = "Wrong-Password1";
    private const int MaxFailedAttempts = 3;

    /// <summary>
    /// Plain accessor (no <see cref="AsyncLocal{T}"/>) so the test can supply one fixed
    /// request context while <see cref="SignInManager{TUser}"/> performs a successful sign-in.
    /// </summary>
    private sealed class StubHttpContextAccessor : IHttpContextAccessor
    {
        public HttpContext? HttpContext { get; set; }
    }

    private static (ServiceProvider Provider, IHttpContextAccessor Accessor) BuildServiceProvider(string databaseName)
    {
        var accessor = new StubHttpContextAccessor();

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDataProtection();
        services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(databaseName));
        services.AddSingleton<IHttpContextAccessor>(accessor);
        services.AddIdentity<AppUser, IdentityRole>(options =>
            {
                options.SignIn.RequireConfirmedAccount = false;
                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.MaxFailedAccessAttempts = MaxFailedAttempts;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddEntityFrameworkStores<AppDbContext>();

        return (services.BuildServiceProvider(), accessor);
    }

    private static async Task<(UserManager<AppUser> UserManager, SignInManager<AppUser> SignInManager, AppUser User)>
        CreateUserAsync(IServiceProvider provider)
    {
        var userManager = provider.GetRequiredService<UserManager<AppUser>>();
        var signInManager = provider.GetRequiredService<SignInManager<AppUser>>();

        var user = new AppUser { UserName = Email, Email = Email, EmailConfirmed = true };
        var createResult = await userManager.CreateAsync(user, Password);
        Assert.True(createResult.Succeeded);

        return (userManager, signInManager, user);
    }

    private static async Task LockAccountAsync(SignInManager<AppUser> signInManager, AppUser user)
    {
        for (var attempt = 0; attempt < MaxFailedAttempts; attempt++)
            await signInManager.PasswordSignInAsync(user, WrongPassword, isPersistent: true, lockoutOnFailure: true);
    }

    [Fact]
    public async Task PasswordSignInAsync_LocksAccount_WhenFailedAttemptThresholdExceeded()
    {
        var (provider, accessor) = BuildServiceProvider($"Lockout_{Guid.NewGuid()}");
        using (provider)
        {
            using var scope = provider.CreateScope();
            accessor.HttpContext = new DefaultHttpContext { RequestServices = scope.ServiceProvider };
            var (userManager, signInManager, user) = await CreateUserAsync(scope.ServiceProvider);

            Assert.True(await userManager.GetLockoutEnabledAsync(user));

            for (var attempt = 0; attempt < MaxFailedAttempts - 1; attempt++)
            {
                var failed = await signInManager.PasswordSignInAsync(
                    user, WrongPassword, isPersistent: true, lockoutOnFailure: true);

                Assert.False(failed.Succeeded);
                Assert.False(failed.IsLockedOut);
            }

            var locking = await signInManager.PasswordSignInAsync(
                user, WrongPassword, isPersistent: true, lockoutOnFailure: true);

            Assert.True(locking.IsLockedOut);
            Assert.True(await userManager.IsLockedOutAsync(user));
        }
    }

    [Fact]
    public async Task PasswordSignInAsync_ReportsLockedOut_WhenPasswordIsCorrectButAccountIsLocked()
    {
        var (provider, accessor) = BuildServiceProvider($"Lockout_{Guid.NewGuid()}");
        using (provider)
        {
            using var scope = provider.CreateScope();
            accessor.HttpContext = new DefaultHttpContext { RequestServices = scope.ServiceProvider };
            var (_, signInManager, user) = await CreateUserAsync(scope.ServiceProvider);

            await LockAccountAsync(signInManager, user);

            var result = await signInManager.PasswordSignInAsync(
                user, Password, isPersistent: true, lockoutOnFailure: true);

            Assert.False(result.Succeeded);
            Assert.True(result.IsLockedOut);
        }
    }

    [Fact]
    public async Task PasswordSignInAsync_SucceedsWithCorrectPassword_WhenLockoutWindowElapsed()
    {
        var (provider, accessor) = BuildServiceProvider($"Lockout_{Guid.NewGuid()}");
        using (provider)
        {
            using var scope = provider.CreateScope();
            accessor.HttpContext = new DefaultHttpContext { RequestServices = scope.ServiceProvider };
            var (userManager, signInManager, user) = await CreateUserAsync(scope.ServiceProvider);

            await LockAccountAsync(signInManager, user);
            await userManager.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddMinutes(-1));

            var result = await signInManager.PasswordSignInAsync(
                user, Password, isPersistent: true, lockoutOnFailure: true);

            Assert.True(result.Succeeded);
            Assert.Equal(0, await userManager.GetAccessFailedCountAsync(user));
        }
    }
}
