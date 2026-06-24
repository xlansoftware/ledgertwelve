using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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
        await SeedCategoriesAsync(serviceProvider);
        await SeedMainBookAsync(serviceProvider);
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
    }

    private static async Task SeedMainBookAsync(IServiceProvider serviceProvider)
    {
        var context = serviceProvider.GetRequiredService<AppDbContext>();
        var userManager = serviceProvider.GetRequiredService<UserManager<AppUser>>();

        var user = await userManager.FindByEmailAsync("demo@example.com");
        if (user == null) return;

        var userId = Guid.Parse(user.Id);

        if (await context.Books.AnyAsync(b => b.OwnerId == userId && b.Name == "Main"))
            return;

        var mainBook = new Book("Main", userId, "EUR");
        context.Books.Add(mainBook);
        await context.SaveChangesAsync();
    }

    private static async Task SeedCategoriesAsync(IServiceProvider serviceProvider)
    {
        var context = serviceProvider.GetRequiredService<AppDbContext>();
        var userManager = serviceProvider.GetRequiredService<UserManager<AppUser>>();

        var user = await userManager.FindByEmailAsync("demo@example.com");
        if (user == null) return;

        var userId = Guid.Parse(user.Id);

        if (await context.Categories.AnyAsync(c => c.UserId == userId))
            return;

        var categories = new List<Category>
        {
            new("Groceries",       userId, "#fde68a",  "shopping-cart", 1),
            new("Rent / Mortgage", userId, "#fca5a5",  "home",          2),
            new("Utilities",       userId, "#a5b4fc",  "plug",          3),
            new("Transportation",  userId, "#bbf7d0",  "car",           4),
            new("Insurance",       userId, "#fcd34d",  "shield",        5),
            new("Dining Out",      userId, "#FFCAD4",  "utensils",      6),
            new("Entertainment",   userId, "#bae6fd",  "film",          7),
            new("Health / Medical",userId, "#FF595E",  "heart",         8),
            new("Personal Care",   userId, "#ddd6fe",  "smile",         9),
            new("Subscriptions",   userId, "#fde2e4",  "credit-card",   10),
            new("Clothing",        userId, "#e0f2fe",  "shirt",         11),
            new("Gifts",           userId, "#d9f99d",  "gift",          12),
            new("Travel",          userId, "#a7f3d0",  "plane",         13),
            new("Education",       userId, "#fef9c3",  "book",          14),
            new("Savings",         userId, "#f0abfc",  "piggy-bank",    15),
            new("Miscellaneous",   userId, "#FDFFB6",  "dots-horizontal", 16),
            new("Pets",            userId, "#4d22b2",  "heart",         17),
            new("Taxes",           userId, "#e22400",  "edit",          18),
            new("Maintenance",     userId, "#ad3e00",  "home",          19),
            new("Parents",         userId, "#3A86FF",  "file",          20),
            new("Sport",           userId, "#F72585",  "smile",         21),
            new("Kids",            userId, "#FF6B6B",  "piggy-bank",    22),
        };

        context.Categories.AddRange(categories);
        await context.SaveChangesAsync();

        // Seed deterministic transactions
        await SeedTransactionsAsync(context, userId);
    }

    private static async Task SeedTransactionsAsync(AppDbContext context, Guid userId)
    {
        if (await context.Transactions.AnyAsync())
            return;

        var mainBook = await context.Books.FirstAsync(b => b.OwnerId == userId && b.Name == "Main");

        var random = new Random(42);
        for (int year = 2025; year <= 2026; year++)
        {
            for (int month = 1; month <= 12; month++)
            {
                // Income: salary on 1st
                var salaryTx = new Transaction(
                    mainBook.Id, userId,
                    new DateTimeOffset(year, month, 1, 8, 0, 0, TimeSpan.Zero),
                    3200m + (year - 2025) * 150,
                    categoryName: "Savings",
                    note: "Monthly salary"
                );
                context.Transactions.Add(salaryTx);

                // Expenses spread through the month
                var day = 3;
                foreach (var expense in GetMonthlyExpenses(random, year, month))
                {
                    if (day > 28) day = 3;
                    var tx = new Transaction(
                        mainBook.Id, userId,
                        new DateTimeOffset(year, month, day, random.Next(8, 20), random.Next(0, 60), 0, TimeSpan.Zero),
                        -expense.Amount,
                        categoryName: expense.Category,
                        note: expense.Note
                    );
                    context.Transactions.Add(tx);
                    day += random.Next(1, 4);
                }
            }
        }

        await context.SaveChangesAsync();
    }

    private static List<(decimal Amount, string Category, string Note)> GetMonthlyExpenses(Random rng, int year, int month)
    {
        var isSummer = month >= 6 && month <= 8;
        var isWinter = month == 12 || month == 1 || month == 2;

        return new()
        {
            (rng.Next(250, 450), "Groceries", "Weekly groceries"),
            (rng.Next(200, 350), "Groceries", "Weekly groceries"),
            (rng.Next(180, 300), "Groceries", "Weekly groceries"),
            (rng.Next(1200, 1500), "Rent / Mortgage", "Monthly rent"),
            (isWinter ? rng.Next(150, 220) : rng.Next(70, 110), "Utilities", "Utilities bill"),
            (isSummer ? rng.Next(60, 100) : rng.Next(50, 80), "Transportation", "Fuel / transit"),
            (rng.Next(40, 80), "Dining Out", "Restaurant"),
            (isSummer ? rng.Next(60, 120) : rng.Next(30, 60), "Entertainment", "Movies / activities"),
            (rng.Next(20, 50), "Subscriptions", "Netflix / Spotify"),
            (rng.Next(30, 100), "Miscellaneous", "Random purchases"),
            (rng.Next(20, 60), "Personal Care", "Personal care items"),
            (rng.Next(100, 300), "Insurance", "Health insurance"),
        };
    }
}
