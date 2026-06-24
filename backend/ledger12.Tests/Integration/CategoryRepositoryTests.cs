using Microsoft.EntityFrameworkCore;
using ledger12.Domain.Entities;
using ledger12.Infrastructure.Data;
using ledger12.Infrastructure.Repositories;

namespace ledger12.Tests.Integration;

public class CategoryRepositoryTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly CategoryRepository _repository;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _otherUserId = Guid.NewGuid();

    public CategoryRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"CatRepoTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new AppDbContext(options);
        _repository = new CategoryRepository(_context);

        SeedData();
    }

    private void SeedData()
    {
        _context.Categories.AddRange(
            new Category("Food", _userId, "#ff0000", "food-icon", 1, false),
            new Category("Transport", _userId, "#00ff00", "car-icon", 2, false),
            new Category("Salary", _userId, "#0000ff", "money-icon", 3, true),
            new Category("Other User Cat", _otherUserId, "#000", null, 1, false)
        );
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsCategory_WhenExists()
    {
        var categories = await _context.Categories.ToListAsync();
        var first = categories.First(c => c.UserId == _userId);

        var result = await _repository.GetByIdAsync(first.Id);

        Assert.NotNull(result);
        Assert.Equal(first.Name, result!.Name);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenNotExists()
    {
        var result = await _repository.GetByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task GetByUserAsync_ReturnsOnlyUserCategories()
    {
        var result = await _repository.GetByUserAsync(_userId);

        Assert.Equal(3, result.Count);
        Assert.All(result, c => Assert.Equal(_userId, c.UserId));
    }

    [Fact]
    public async Task GetByNameAsync_ReturnsCategory_WhenExists()
    {
        var result = await _repository.GetByNameAsync(_userId, "Food");

        Assert.NotNull(result);
        Assert.Equal("Food", result!.Name);
    }

    [Fact]
    public async Task GetByNameAsync_ReturnsNull_WhenNotExists()
    {
        var result = await _repository.GetByNameAsync(_userId, "NonExistent");

        Assert.Null(result);
    }

    [Fact]
    public async Task GetByNameAsync_ReturnsNull_ForOtherUserCategory()
    {
        var result = await _repository.GetByNameAsync(_userId, "Other User Cat");

        Assert.Null(result);
    }

    [Fact]
    public async Task AddAsync_PersistsCategory()
    {
        var category = new Category("New Cat", _userId, "#fff", "new-icon", 5, true);

        await _repository.AddAsync(category);

        var saved = await _context.Categories.FindAsync(category.Id);
        Assert.NotNull(saved);
        Assert.Equal("New Cat", saved!.Name);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesCategory()
    {
        var categories = await _context.Categories.ToListAsync();
        var food = categories.First(c => c.Name == "Food");

        food.Update("Groceries", true, "#111", "basket");
        await _repository.UpdateAsync(food);

        var saved = await _context.Categories.FindAsync(food.Id);
        Assert.Equal("Groceries", saved!.Name);
        Assert.True(saved.Recurring);
        Assert.Equal("#111", saved.Color);
        Assert.Equal("basket", saved.Icon);
    }

    [Fact]
    public async Task DeleteAsync_RemovesCategory()
    {
        var categories = await _context.Categories.ToListAsync();
        var food = categories.First(c => c.Name == "Food");

        await _repository.DeleteAsync(food);

        var saved = await _context.Categories.FindAsync(food.Id);
        Assert.Null(saved);
    }

    [Fact]
    public async Task GetMaxOrderAsync_ReturnsHighestOrder()
    {
        var result = await _repository.GetMaxOrderAsync(_userId);

        Assert.Equal(3, result);
    }

    [Fact]
    public async Task GetMaxOrderAsync_ReturnsZero_WhenNoCategories()
    {
        var result = await _repository.GetMaxOrderAsync(Guid.NewGuid());

        Assert.Equal(0, result);
    }
}
