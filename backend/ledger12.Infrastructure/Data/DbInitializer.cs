using ledger12.Application.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ledger12.Domain;

namespace ledger12.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        await SeedBookAsync(serviceProvider);
        await SeedUserAsync(serviceProvider);
        await SeedCategoriesAsync(serviceProvider);
        await SeedTransactionsAsync(serviceProvider);
    }

    private static async Task SeedBookAsync(IServiceProvider serviceProvider)
    {
        var context = serviceProvider.GetRequiredService<AppDbContext>();

        if (await context.Books.AnyAsync())
            return;

        var books = new List<Book>
        {
            new("Ledger", ""),
        };

        context.Books.AddRange(books);
        await context.SaveChangesAsync();
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

    private static async Task SeedCategoriesAsync(IServiceProvider serviceProvider)
    {
        var context = serviceProvider.GetRequiredService<AppDbContext>();

        if (await context.Categories.AnyAsync())
            return;

        var categories = new List<Category>
        {
            new("Groceries",       "#fde68a",  1,  "shopping-cart"),
            new("Rent / Mortgage", "#fca5a5",  21, "home"),
            new("Utilities",       "#a5b4fc",  4,  "plug"),
            new("Transportation",  "#bbf7d0",  6,  "car"),
            new("Insurance",       "#fcd34d",  17, "shield"),
            new("Dining Out",      "#FFCAD4",  5,  "utensils"),
            new("Entertainment",   "#bae6fd",  8,  "film"),
            new("Health / Medical","#FF595E",  10, "heart"),
            new("Personal Care",   "#ddd6fe",  11, "smile"),
            new("Subscriptions",   "#fde2e4",  20, "credit-card"),
            new("Clothing",        "#e0f2fe",  12, "shirt"),
            new("Gifts",           "#d9f99d",  14, "gift"),
            new("Travel",          "#a7f3d0",  13, "plane"),
            new("Education",       "#fef9c3",  15, "book"),
            new("Savings",         "#f0abfc",  18, "piggy-bank"),
            new("Miscellaneous",   "#FDFFB6",  9,  "dots-horizontal"),
            new("Pets",            "#4d22b2",  2,  "heart"),
            new("Taxes",           "#e22400",  19, "edit"),
            new("Maintenance",     "#ad3e00",  3,  "home"),
            new("Parents",         "#3A86FF",  16, "file"),
            new("Sport",           "#F72585",  7,  "smile"),
            new("Kids",            "#FF6B6B",  22, "piggy-bank"),
        };

        context.Categories.AddRange(categories);
        await context.SaveChangesAsync();
    }

    private static async Task SeedTransactionsAsync(IServiceProvider serviceProvider)
    {
        var repository = serviceProvider.GetRequiredService<ITransactionRepository>();

        // Check if transactions already exist
        var context = serviceProvider.GetRequiredService<AppDbContext>();
        if (await context.Transactions.AnyAsync())
            return;

        // Deterministic seed data spanning Jan 2025 – Dec 2026
        for (int year = 2025; year <= 2026; year++)
        {
            for (int month = 1; month <= 12; month++)
            {
                foreach (var author in new[] { "Alice", "Bob" })
                {
                    await AddMonthlyTransaction(repository, author, "Food", FoodAmount(author, year, month), year, month);
                    await AddMonthlyTransaction(repository, author, "Transport", TransportAmount(author, month), year, month);
                    await AddMonthlyTransaction(repository, author, "Utilities", UtilitiesAmount(author, month), year, month);
                    await AddMonthlyTransaction(repository, author, "Entertainment", EntertainmentAmount(author, month), year, month);

                    // Salary: only Alice
                    if (author == "Alice")
                    {
                        await AddMonthlyTransaction(repository, author, "Salary", 3200m + (year - 2025) * 150, year, month);
                    }
                }
            }
        }
    }

    private static async Task AddMonthlyTransaction(
        ITransactionRepository repository,
        string author,
        string category,
        decimal value,
        int year,
        int month)
    {
        // Place the transaction on the 15th of the month
        var date = new DateTimeOffset(year, month, 15, 12, 0, 0, TimeSpan.Zero);

        var transaction = new Transaction(
            value: value,
            currency: "EUR",
            category: category,
            author: author,
            date: date,
            book: null
        );

        await repository.AddAsync(transaction);
    }

    // ─── Amount helpers with seasonal / trending patterns ───────────────

    private static decimal FoodAmount(string author, int year, int month)
    {
        // Base amount: slowly increasing over time (inflation)
        decimal b = author == "Alice" ? 350m : 250m;
        // 1.5% annual increase
        decimal trend = b * (0.015m * (year - 2025));
        // slight summer lift (+5% in Jun, Jul, Aug)
        decimal seasonal = month >= 6 && month <= 8 ? b * 0.05m : 0;
        return Math.Round(b + trend + seasonal, 2);
    }

    private static decimal TransportAmount(string author, int month)
    {
        // Constant base
        decimal b = author == "Alice" ? 75m : 60m;
        // Higher in summer (more trips)
        decimal seasonal = month >= 6 && month <= 8 ? b * 0.20m : 0;
        return Math.Round(b + seasonal, 2);
    }

    private static decimal UtilitiesAmount(string author, int month)
    {
        decimal b = author == "Alice" ? 120m : 90m;
        // Higher in winter (heating)
        decimal seasonal = month == 12 || month == 1 || month == 2 ? b * 0.50m : 0;
        return Math.Round(b + seasonal, 2);
    }

    private static decimal EntertainmentAmount(string author, int month)
    {
        decimal b = author == "Alice" ? 50m : 40m;
        // Much higher in summer (activities, holidays)
        decimal seasonal = month >= 6 && month <= 8 ? b * 0.80m : 0;
        return Math.Round(b + seasonal, 2);
    }
}