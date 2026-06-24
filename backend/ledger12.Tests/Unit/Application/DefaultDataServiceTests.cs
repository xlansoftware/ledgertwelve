using Moq;
using ledger12.Application.Interfaces;
using ledger12.Application.Services;
using ledger12.Domain.Entities;

namespace ledger12.Tests.Unit.Application;

public class DefaultDataServiceTests
{
    private readonly Mock<IBookRepository> _bookRepo;
    private readonly Mock<ICategoryRepository> _categoryRepo;
    private readonly DefaultDataService _service;
    private readonly Guid _userId = Guid.NewGuid();

    public DefaultDataServiceTests()
    {
        _bookRepo = new Mock<IBookRepository>();
        _categoryRepo = new Mock<ICategoryRepository>();
        _service = new DefaultDataService(_bookRepo.Object, _categoryRepo.Object);
    }

    [Fact]
    public async Task EnsureDefaultsAsync_CreatesMainBook_WhenNoMainBookExists()
    {
        _bookRepo.Setup(r => r.GetMainBookAsync(_userId)).ReturnsAsync((Book?)null);
        _categoryRepo.Setup(r => r.GetByUserAsync(_userId)).ReturnsAsync(new List<Category>());
        _bookRepo.Setup(r => r.AddAsync(It.IsAny<Book>())).Returns(Task.CompletedTask);
        _categoryRepo.Setup(r => r.AddAsync(It.IsAny<Category>())).Returns(Task.CompletedTask);

        await _service.EnsureDefaultsAsync(_userId);

        _bookRepo.Verify(r => r.AddAsync(It.Is<Book>(b =>
            b.Name == "Main" &&
            b.OwnerId == _userId &&
            b.Currency == "EUR")), Times.Once);
    }

    [Fact]
    public async Task EnsureDefaultsAsync_Creates22Categories_WhenNoCategoriesExist()
    {
        _bookRepo.Setup(r => r.GetMainBookAsync(_userId)).ReturnsAsync((Book?)null);
        _categoryRepo.Setup(r => r.GetByUserAsync(_userId)).ReturnsAsync(new List<Category>());
        _bookRepo.Setup(r => r.AddAsync(It.IsAny<Book>())).Returns(Task.CompletedTask);
        _categoryRepo.Setup(r => r.AddAsync(It.IsAny<Category>())).Returns(Task.CompletedTask);

        await _service.EnsureDefaultsAsync(_userId);

        _categoryRepo.Verify(r => r.AddAsync(It.IsAny<Category>()), Times.Exactly(22));
    }

    [Fact]
    public async Task EnsureDefaultsAsync_SkipsBookCreation_WhenMainBookExists()
    {
        var existingBook = new Book("Main", _userId, "EUR");
        _bookRepo.Setup(r => r.GetMainBookAsync(_userId)).ReturnsAsync(existingBook);
        _categoryRepo.Setup(r => r.GetByUserAsync(_userId)).ReturnsAsync(new List<Category>());
        _categoryRepo.Setup(r => r.AddAsync(It.IsAny<Category>())).Returns(Task.CompletedTask);

        await _service.EnsureDefaultsAsync(_userId);

        _bookRepo.Verify(r => r.AddAsync(It.IsAny<Book>()), Times.Never);
    }

    [Fact]
    public async Task EnsureDefaultsAsync_SkipsCategoryCreation_WhenCategoriesExist()
    {
        _bookRepo.Setup(r => r.GetMainBookAsync(_userId)).ReturnsAsync((Book?)null);
        _categoryRepo.Setup(r => r.GetByUserAsync(_userId)).ReturnsAsync(new List<Category>
        {
            new("Existing", _userId, "#000000", "star", 1)
        });
        _bookRepo.Setup(r => r.AddAsync(It.IsAny<Book>())).Returns(Task.CompletedTask);

        await _service.EnsureDefaultsAsync(_userId);

        _categoryRepo.Verify(r => r.AddAsync(It.IsAny<Category>()), Times.Never);
    }

    [Fact]
    public async Task EnsureDefaultsAsync_CreatesCategoriesWithCorrectProperties()
    {
        _bookRepo.Setup(r => r.GetMainBookAsync(_userId)).ReturnsAsync((Book?)null);
        _categoryRepo.Setup(r => r.GetByUserAsync(_userId)).ReturnsAsync(new List<Category>());
        _bookRepo.Setup(r => r.AddAsync(It.IsAny<Book>())).Returns(Task.CompletedTask);
        var capturedCategories = new List<Category>();
        _categoryRepo.Setup(r => r.AddAsync(It.IsAny<Category>()))
            .Callback<Category>(cat => capturedCategories.Add(cat))
            .Returns(Task.CompletedTask);

        await _service.EnsureDefaultsAsync(_userId);

        Assert.Equal(22, capturedCategories.Count);

        // Verify specific categories by name and properties
        var groceries = capturedCategories.Single(c => c.Name == "Groceries");
        Assert.False(groceries.Recurring);
        Assert.Equal("#fde68a", groceries.Color);
        Assert.Equal("shopping-cart", groceries.Icon);
        Assert.Equal(1, groceries.Order);
        Assert.Equal(_userId, groceries.UserId);

        var rent = capturedCategories.Single(c => c.Name == "Rent / Mortgage");
        Assert.True(rent.Recurring);
        Assert.Equal("#fca5a5", rent.Color);
        Assert.Equal("home", rent.Icon);
        Assert.Equal(21, rent.Order);

        var kids = capturedCategories.Single(c => c.Name == "Kids");
        Assert.False(kids.Recurring);
        Assert.Equal("#FF6B6B", kids.Color);
        Assert.Equal("piggy-bank", kids.Icon);
        Assert.Equal(22, kids.Order);

        // Verify all categories have sequential order 1-22
        var orders = capturedCategories.Select(c => c.Order).OrderBy(o => o).ToList();
        Assert.Equal(Enumerable.Range(1, 22), orders);

        // Verify all categories have the correct user ID
        Assert.All(capturedCategories, c => Assert.Equal(_userId, c.UserId));
    }
}
