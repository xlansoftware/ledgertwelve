using ledger12.Application.Interfaces;
using ledger12.Domain.Entities;

namespace ledger12.Application.Services;

public class DefaultDataService : IDefaultDataService
{
    private readonly IBookRepository _bookRepo;
    private readonly ICategoryRepository _categoryRepo;

    public DefaultDataService(IBookRepository bookRepo, ICategoryRepository categoryRepo)
    {
        _bookRepo = bookRepo;
        _categoryRepo = categoryRepo;
    }

    public async Task EnsureDefaultsAsync(Guid userId)
    {
        await EnsureMainBookAsync(userId);
        await EnsureDefaultCategoriesAsync(userId);
    }

    private async Task EnsureMainBookAsync(Guid userId)
    {
        var existing = await _bookRepo.GetMainBookAsync(userId);
        if (existing is not null)
            return;

        var mainBook = new Book("Main", userId, "EUR");
        await _bookRepo.AddAsync(mainBook);
    }

    private async Task EnsureDefaultCategoriesAsync(Guid userId)
    {
        var existing = await _categoryRepo.GetByUserAsync(userId);
        if (existing.Count > 0)
            return;

        foreach (var (name, recurring, color, icon, order) in DefaultCategories)
        {
            var category = new Category(name, userId, color, icon, order, recurring);
            await _categoryRepo.AddAsync(category);
        }
    }

    private static readonly (string Name, bool Recurring, string Color, string Icon, int Order)[] DefaultCategories =
    [
        ("Groceries", false, "#fde68a", "shopping-cart", 1),
        ("Pets", false, "#4d22b2", "heart", 2),
        ("Maintenance", true, "#ad3e00", "home", 3),
        ("Utilities", true, "#a5b4fc", "plug", 4),
        ("Dining Out", false, "#FFCAD4", "utensils", 5),
        ("Transportation", false, "#bbf7d0", "car", 6),
        ("Sport", false, "#F72585", "smile", 7),
        ("Entertainment", false, "#bae6fd", "film", 8),
        ("Miscellaneous", false, "#FDFFB6", "dots-horizontal", 9),
        ("Health / Medical", false, "#FF595E", "heart", 10),
        ("Personal Care", false, "#ddd6fe", "smile", 11),
        ("Clothing", false, "#e0f2fe", "shirt", 12),
        ("Travel", false, "#a7f3d0", "plane", 13),
        ("Gifts", false, "#d9f99d", "gift", 14),
        ("Education", false, "#fef9c3", "book", 15),
        ("Parents", false, "#3A86FF", "file", 16),
        ("Insurance", true, "#fcd34d", "shield", 17),
        ("Savings", false, "#f0abfc", "piggy-bank", 18),
        ("Taxes", true, "#e22400", "edit", 19),
        ("Subscriptions", true, "#fde2e4", "credit-card", 20),
        ("Rent / Mortgage", true, "#fca5a5", "home", 21),
        ("Kids", false, "#FF6B6B", "piggy-bank", 22)
    ];
}
