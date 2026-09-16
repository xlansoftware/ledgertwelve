using Microsoft.EntityFrameworkCore;
using ledger12.Application.Services;
using ledger12.Domain.Entities;
using ledger12.Domain.Enums;
using ledger12.Domain.Exceptions;
using ledger12.Infrastructure.Data;
using ledger12.Infrastructure.Repositories;

namespace ledger12.Tests.Integration;

public class TransactionServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly TransactionService _service;

    private readonly Guid _userA = Guid.NewGuid();
    private readonly Guid _userB = Guid.NewGuid();
    private readonly Guid _userC = Guid.NewGuid();

    private readonly Book _bookA;
    private readonly Book _bookB;
    private readonly Book _sharedBookA;

    public TransactionServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"TxSearchScopeTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new AppDbContext(options);
        var bookRepo = new BookRepository(_context);
        var transactionRepo = new TransactionRepository(_context);
        _service = new TransactionService(transactionRepo, bookRepo);

        _bookA = new Book("A Main", _userA);
        _bookB = new Book("B Main", _userB);
        _sharedBookA = new Book("A Shared", _userA);
        _sharedBookA.Shares.Add(new BookShare(_sharedBookA.Id, _userC, BookPermission.View));

        _context.Books.AddRange(_bookA, _bookB, _sharedBookA);
        _context.Transactions.AddRange(
            NewTransaction(_bookA, _userA, 100m, "Food", "A lunch"),
            NewTransaction(_bookA, _userA, -20m, "Transport", "A bus"),
            NewTransaction(_sharedBookA, _userA, -5m, "Food", "A shared snack"),
            NewTransaction(_bookB, _userB, 999m, "Salary", "B salary"),
            NewTransaction(_bookB, _userB, -50m, "Food", "B lunch"));
        _context.SaveChanges();
    }

    private static Transaction NewTransaction(Book book, Guid userId, decimal amount, string category, string note) =>
        new(book.Id, userId, new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero), amount,
            categoryName: category, note: note);

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task SearchAsync_ReturnsOnlyCallersVisibleTransactions_WhenBookIdOmitted()
    {
        var result = await _service.SearchAsync(null, null, null, null, null, null, null, null, 1, 50, _userA);

        Assert.Equal(3, result.Data.Count);
        Assert.Equal(3, result.Meta.Total);
        Assert.DoesNotContain(result.Data, d => d.BookId == _bookB.Id.ToString());
        Assert.All(result.Data, d =>
            Assert.True(d.BookId == _bookA.Id.ToString() || d.BookId == _sharedBookA.Id.ToString()));
    }

    [Fact]
    public async Task SearchAsync_DoesNotSeeAnotherUsersTransactions_WhenBookIdOmitted()
    {
        var result = await _service.SearchAsync(null, null, null, null, null, null, null, null, 1, 50, _userB);

        Assert.Equal(2, result.Data.Count);
        Assert.Equal(2, result.Meta.Total);
        Assert.All(result.Data, d => Assert.Equal(_bookB.Id.ToString(), d.BookId));
    }

    [Fact]
    public async Task SearchAsync_IncludesSharedBookTransactions_WhenBookIdOmitted()
    {
        var result = await _service.SearchAsync(null, null, null, null, null, null, null, null, 1, 50, _userC);

        Assert.Single(result.Data);
        Assert.Equal(1, result.Meta.Total);
        Assert.Equal(_sharedBookA.Id.ToString(), result.Data[0].BookId);
    }

    [Fact]
    public async Task SearchAsync_DoesNotReachAcrossTenants_ViaFilters()
    {
        var result = await _service.SearchAsync(
            null, null, null, categories: new List<string> { "Salary" }, createdBy: new List<Guid> { _userB },
            note: "B lunch", minValue: null, maxValue: null, page: 1, pageSize: 50, userId: _userA);

        Assert.Empty(result.Data);
        Assert.Equal(0, result.Meta.Total);
    }

    [Fact]
    public async Task SearchAsync_FiltersWithinVisibleBooks_WhenBookIdOmitted()
    {
        var result = await _service.SearchAsync(
            null, null, null, categories: new List<string> { "Food" }, createdBy: null,
            note: null, minValue: null, maxValue: null, page: 1, pageSize: 50, userId: _userA);

        Assert.Equal(2, result.Data.Count);
        Assert.Equal(2, result.Meta.Total);
        Assert.All(result.Data, d => Assert.Equal("Food", d.CategoryName));
    }

    [Fact]
    public async Task SearchAsync_ThrowsNotFoundException_WhenBookBelongsToAnotherUser()
    {
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _service.SearchAsync(_bookB.Id, null, null, null, null, null, null, null, 1, 50, _userA));
    }

    [Fact]
    public async Task SearchAsync_ReturnsOnlyRequestedBook_WhenBookBelongsToCaller()
    {
        var result = await _service.SearchAsync(_bookA.Id, null, null, null, null, null, null, null, 1, 50, _userA);

        Assert.Equal(2, result.Data.Count);
        Assert.Equal(2, result.Meta.Total);
        Assert.All(result.Data, d => Assert.Equal(_bookA.Id.ToString(), d.BookId));
    }
}
