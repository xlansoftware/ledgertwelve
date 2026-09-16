using ledger12.Application.Interfaces;
using ledger12.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace ledger12.Tests.Integration;

public class DbInitializerTests
{
    private const string DemoEmail = "demo@example.com";

    private static ServiceProvider BuildServiceProvider(IDefaultDataService defaultDataService)
    {
        var services = new ServiceCollection();

        services.AddDbContext<AppDbContext>(options =>
            options.UseInMemoryDatabase($"DbInitializerTest_{Guid.NewGuid()}"));

        services.AddIdentityCore<AppUser>(options =>
                options.SignIn.RequireConfirmedAccount = false)
            .AddEntityFrameworkStores<AppDbContext>();

        services.AddScoped(_ => defaultDataService);

        return services.BuildServiceProvider();
    }

    [Fact]
    public async Task SeedAsync_DoesNotCreateDemoUser_WhenNotDevelopment()
    {
        var defaults = new Mock<IDefaultDataService>();
        using var provider = BuildServiceProvider(defaults.Object);
        using var scope = provider.CreateScope();

        await DbInitializer.SeedAsync(scope.ServiceProvider, isDevelopment: false);

        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        Assert.Null(await userManager.FindByEmailAsync(DemoEmail));
        defaults.Verify(s => s.EnsureDefaultsAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task SeedAsync_CreatesDemoUserWithDefaults_WhenDevelopment()
    {
        var defaults = new Mock<IDefaultDataService>();
        using var provider = BuildServiceProvider(defaults.Object);
        using var scope = provider.CreateScope();

        await DbInitializer.SeedAsync(scope.ServiceProvider, isDevelopment: true);

        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var user = await userManager.FindByEmailAsync(DemoEmail);
        Assert.NotNull(user);
        Assert.True(user!.EmailConfirmed);
        defaults.Verify(s => s.EnsureDefaultsAsync(Guid.Parse(user.Id)), Times.Once);
    }
}
