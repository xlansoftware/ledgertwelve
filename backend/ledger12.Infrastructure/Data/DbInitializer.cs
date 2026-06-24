using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ledger12.Application.Interfaces;
using ledger12.Domain.Entities;
using ledger12.Domain.Enums;
using ledger12.Infrastructure.Data;
using Microsoft.Extensions.DependencyInjection;

namespace ledger12.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        await SeedUserAsync(serviceProvider);
    }

    private static async Task SeedUserAsync(IServiceProvider serviceProvider)
    {
        var userManager = serviceProvider.GetRequiredService<UserManager<AppUser>>();

        const string email = "demo@example.com";

        if (await userManager.FindByEmailAsync(email) is not null)
            return;

        var user = new AppUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true
        };

        var result = await userManager.CreateAsync(user, "Example-1");

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Failed to seed demo user: {errors}");
        }

        var defaultDataService = serviceProvider.GetRequiredService<IDefaultDataService>();
        await defaultDataService.EnsureDefaultsAsync(Guid.Parse(user.Id));
    }
}
