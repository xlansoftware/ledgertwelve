using Microsoft.EntityFrameworkCore;
using ledger12.Domain.Entities;
using ledger12.Domain.Enums;
using ledger12.Infrastructure.Data;
using ledger12.Infrastructure.Repositories;

namespace ledger12.Tests.Integration;

public class BookRepositoryTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly BookRepository _repository;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _otherUserId = Guid.NewGuid();

    public BookRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"BookRepoTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new AppDbContext(options);
        _repository = new BookRepository(_context);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task AddAsync_PersistsBook()
    {
        var book = new Book("Test Book", _userId, "EUR");

        await _repository.AddAsync(book);

        var saved = await _context.Books.FindAsync(book.Id);
        Assert.NotNull(saved);
        Assert.Equal("Test Book", saved!.Name);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsBook_WhenExists()
    {
        var book = new Book("Test", _userId, "EUR");
        _context.Books.Add(book);
        await _context.SaveChangesAsync();

        var result = await _repository.GetByIdAsync(book.Id);

        Assert.NotNull(result);
        Assert.Equal(book.Id, result!.Id);
        Assert.Equal("Test", result.Name);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenNotExists()
    {
        var result = await _repository.GetByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task GetVisibleBooksAsync_ReturnsOwnedBooks()
    {
        var book = new Book("Owned", _userId, "EUR");
        _context.Books.Add(book);
        await _context.SaveChangesAsync();

        var result = await _repository.GetVisibleBooksAsync(_userId);

        Assert.Contains(result, b => b.Id == book.Id);
    }

    [Fact]
    public async Task GetVisibleBooksAsync_ReturnsSharedBooks()
    {
        var book = new Book("Shared", _otherUserId, "EUR");
        _context.Books.Add(book);
        var share = new BookShare(book.Id, _userId, BookPermission.View);
        _context.BookShares.Add(share);
        await _context.SaveChangesAsync();

        var result = await _repository.GetVisibleBooksAsync(_userId);

        Assert.Contains(result, b => b.Id == book.Id);
    }

    [Fact]
    public async Task GetVisibleBooksAsync_ExcludesNonVisibleBooks()
    {
        var book = new Book("Private", _otherUserId, "EUR");
        _context.Books.Add(book);
        await _context.SaveChangesAsync();

        var result = await _repository.GetVisibleBooksAsync(_userId);

        Assert.DoesNotContain(result, b => b.Id == book.Id);
    }

    [Fact]
    public async Task GetVisibleBookAsync_ReturnsBook_WhenOwner()
    {
        var book = new Book("Test", _userId, "EUR");
        _context.Books.Add(book);
        await _context.SaveChangesAsync();

        var result = await _repository.GetVisibleBookAsync(book.Id, _userId);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetVisibleBookAsync_ReturnsBook_WhenShared()
    {
        var book = new Book("Test", _otherUserId, "EUR");
        _context.Books.Add(book);
        _context.BookShares.Add(new BookShare(book.Id, _userId, BookPermission.View));
        await _context.SaveChangesAsync();

        var result = await _repository.GetVisibleBookAsync(book.Id, _userId);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetVisibleBookAsync_ReturnsNull_WhenNotVisible()
    {
        var book = new Book("Test", _otherUserId, "EUR");
        _context.Books.Add(book);
        await _context.SaveChangesAsync();

        var result = await _repository.GetVisibleBookAsync(book.Id, _userId);

        Assert.Null(result);
    }

    [Fact]
    public async Task IsVisibleAsync_ReturnsTrue_WhenOwner()
    {
        var book = new Book("Test", _userId, "EUR");
        _context.Books.Add(book);
        await _context.SaveChangesAsync();

        var result = await _repository.IsVisibleAsync(book.Id, _userId);

        Assert.True(result);
    }

    [Fact]
    public async Task IsVisibleAsync_ReturnsFalse_WhenNotVisible()
    {
        var book = new Book("Test", _otherUserId, "EUR");
        _context.Books.Add(book);
        await _context.SaveChangesAsync();

        var result = await _repository.IsVisibleAsync(book.Id, _userId);

        Assert.False(result);
    }

    [Fact]
    public async Task HasEditAccessAsync_ReturnsTrue_WhenOwner()
    {
        var book = new Book("Test", _userId, "EUR");
        _context.Books.Add(book);
        await _context.SaveChangesAsync();

        var result = await _repository.HasEditAccessAsync(book.Id, _userId);

        Assert.True(result);
    }

    [Fact]
    public async Task HasEditAccessAsync_ReturnsTrue_WhenSharedWithEdit()
    {
        var book = new Book("Test", _otherUserId, "EUR");
        _context.Books.Add(book);
        _context.BookShares.Add(new BookShare(book.Id, _userId, BookPermission.Edit));
        await _context.SaveChangesAsync();

        var result = await _repository.HasEditAccessAsync(book.Id, _userId);

        Assert.True(result);
    }

    [Fact]
    public async Task HasEditAccessAsync_ReturnsFalse_WhenSharedWithView()
    {
        var book = new Book("Test", _otherUserId, "EUR");
        _context.Books.Add(book);
        _context.BookShares.Add(new BookShare(book.Id, _userId, BookPermission.View));
        await _context.SaveChangesAsync();

        var result = await _repository.HasEditAccessAsync(book.Id, _userId);

        Assert.False(result);
    }

    [Fact]
    public async Task GetMainBookAsync_ReturnsMainBook()
    {
        var mainBook = new Book("Main", _userId, "EUR");
        _context.Books.Add(mainBook);
        await _context.SaveChangesAsync();

        var result = await _repository.GetMainBookAsync(_userId);

        Assert.NotNull(result);
        Assert.Equal("Main", result!.Name);
    }

    [Fact]
    public async Task GetMainBookAsync_ReturnsNull_WhenNoMainBook()
    {
        var result = await _repository.GetMainBookAsync(_userId);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesBook()
    {
        var book = new Book("Original", _userId, "EUR");
        _context.Books.Add(book);
        await _context.SaveChangesAsync();

        book.Update("Updated", "USD");
        await _repository.UpdateAsync(book);

        var saved = await _context.Books.FindAsync(book.Id);
        Assert.Equal("Updated", saved!.Name);
        Assert.Equal("USD", saved.Currency);
    }

    [Fact]
    public async Task DeleteAsync_RemovesBook()
    {
        var book = new Book("Test", _userId, "EUR");
        _context.Books.Add(book);
        await _context.SaveChangesAsync();

        await _repository.DeleteAsync(book);

        var saved = await _context.Books.FindAsync(book.Id);
        Assert.Null(saved);
    }

    [Fact]
    public async Task HasTransactionsAsync_ReturnsFalse_WhenNoTransactions()
    {
        var book = new Book("Test", _userId, "EUR");
        _context.Books.Add(book);
        await _context.SaveChangesAsync();

        var result = await _repository.HasTransactionsAsync(book.Id);

        Assert.False(result);
    }

    [Fact]
    public async Task HasTransactionsAsync_ReturnsTrue_WhenTransactionsExist()
    {
        var book = new Book("Test", _userId, "EUR");
        _context.Books.Add(book);
        _context.Transactions.Add(new Transaction(book.Id, _userId, DateTimeOffset.UtcNow, 100m));
        await _context.SaveChangesAsync();

        var result = await _repository.HasTransactionsAsync(book.Id);

        Assert.True(result);
    }

    [Fact]
    public async Task GetTotalSumAsync_ReturnsSum_ExcludingClosingEntries()
    {
        var book = new Book("Test", _userId, "EUR");
        _context.Books.Add(book);
        _context.Transactions.Add(new Transaction(book.Id, _userId, DateTimeOffset.UtcNow, 100m));
        _context.Transactions.Add(new Transaction(book.Id, _userId, DateTimeOffset.UtcNow, -50m));
        _context.Transactions.Add(new Transaction(
            book.Id, _userId, DateTimeOffset.UtcNow, 1000m,
            isBookClosingEntry: true, closedBookId: Guid.NewGuid()));
        await _context.SaveChangesAsync();

        var result = await _repository.GetTotalSumAsync(book.Id);

        Assert.Equal(50m, result);
    }

    [Fact]
    public async Task GetTransactionCountAsync_ReturnsCount_ExcludingClosingEntries()
    {
        var book = new Book("Test", _userId, "EUR");
        _context.Books.Add(book);
        _context.Transactions.Add(new Transaction(book.Id, _userId, DateTimeOffset.UtcNow, 100m));
        _context.Transactions.Add(new Transaction(book.Id, _userId, DateTimeOffset.UtcNow, -50m));
        _context.Transactions.Add(new Transaction(
            book.Id, _userId, DateTimeOffset.UtcNow, 1000m,
            isBookClosingEntry: true, closedBookId: Guid.NewGuid()));
        await _context.SaveChangesAsync();

        var result = await _repository.GetTransactionCountAsync(book.Id);

        Assert.Equal(2, result);
    }

    [Fact]
    public async Task GetTotalSumAsync_FiltersByAsOf()
    {
        var book = new Book("Test", _userId, "EUR");
        _context.Books.Add(book);
        _context.Transactions.Add(new Transaction(book.Id, _userId, new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero), 100m));
        _context.Transactions.Add(new Transaction(book.Id, _userId, new DateTimeOffset(2025, 1, 15, 0, 0, 0, TimeSpan.Zero), 200m));
        _context.Transactions.Add(new Transaction(book.Id, _userId, new DateTimeOffset(2025, 2, 1, 0, 0, 0, TimeSpan.Zero), 300m));
        await _context.SaveChangesAsync();

        var asOf = new DateTimeOffset(2025, 1, 15, 0, 0, 0, TimeSpan.Zero);
        var result = await _repository.GetTotalSumAsync(book.Id, asOf);

        // Should include Jan 1 and Jan 15 (asOf.Date.AddDays(1) = Jan 16, so Jan 15 < Jan 16)
        Assert.Equal(300m, result);
    }

    [Fact]
    public async Task AddShareAsync_PersistsShare()
    {
        var book = new Book("Test", _userId, "EUR");
        _context.Books.Add(book);
        await _context.SaveChangesAsync();

        var share = new BookShare(book.Id, _otherUserId, BookPermission.View);
        await _repository.AddShareAsync(share);

        var saved = await _context.BookShares.FindAsync(book.Id, _otherUserId);
        Assert.NotNull(saved);
    }

    [Fact]
    public async Task GetShareAsync_ReturnsShare_WhenExists()
    {
        var book = new Book("Test", _userId, "EUR");
        _context.Books.Add(book);
        _context.BookShares.Add(new BookShare(book.Id, _otherUserId, BookPermission.View));
        await _context.SaveChangesAsync();

        var result = await _repository.GetShareAsync(book.Id, _otherUserId);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetShareAsync_ReturnsNull_WhenNotExists()
    {
        var result = await _repository.GetShareAsync(Guid.NewGuid(), _otherUserId);

        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteShareAsync_RemovesShare()
    {
        var book = new Book("Test", _userId, "EUR");
        _context.Books.Add(book);
        var share = new BookShare(book.Id, _otherUserId, BookPermission.View);
        _context.BookShares.Add(share);
        await _context.SaveChangesAsync();

        await _repository.DeleteShareAsync(share);

        var saved = await _context.BookShares.FindAsync(book.Id, _otherUserId);
        Assert.Null(saved);
    }

    [Fact]
    public async Task GetByOwnerAsync_ReturnsOnlyOwnedBooks()
    {
        var owned = new Book("Owned", _userId, "EUR");
        var other = new Book("Other", _otherUserId, "EUR");
        _context.Books.AddRange(owned, other);
        await _context.SaveChangesAsync();

        var result = await _repository.GetByOwnerAsync(_userId);

        Assert.Single(result);
        Assert.Equal("Owned", result[0].Name);
    }

    [Fact]
    public async Task GetUserIdsWithAccessAsync_ReturnsSharedUserIds()
    {
        var book = new Book("Test", _userId, "EUR");
        _context.Books.Add(book);
        _context.BookShares.Add(new BookShare(book.Id, _otherUserId, BookPermission.View));
        await _context.SaveChangesAsync();

        var result = await _repository.GetUserIdsWithAccessAsync(_userId);

        Assert.Contains(_otherUserId, result);
    }
}
