using Microsoft.EntityFrameworkCore;
using ledger12.Domain.Entities;
using ledger12.Infrastructure.Data;
using ledger12.Infrastructure.Repositories;

namespace ledger12.Tests.Integration;

public class TransactionRepositoryTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly TransactionRepository _repository;
    private readonly Guid _bookId = Guid.NewGuid();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _otherUserId = Guid.NewGuid();

    public TransactionRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"TxRepoTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new AppDbContext(options);
        _repository = new TransactionRepository(_context);

        SeedData();
    }

    private void SeedData()
    {
        _context.Transactions.AddRange(
            new Transaction(_bookId, _userId, new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero), 100m, categoryName: "Food", note: "Lunch"),
            new Transaction(_bookId, _userId, new DateTimeOffset(2025, 1, 15, 0, 0, 0, TimeSpan.Zero), -50m, categoryName: "Transport", note: "Bus"),
            new Transaction(_bookId, _userId, new DateTimeOffset(2025, 2, 1, 0, 0, 0, TimeSpan.Zero), 200m, categoryName: "Food", note: "Groceries"),
            new Transaction(_bookId, _otherUserId, new DateTimeOffset(2025, 3, 1, 0, 0, 0, TimeSpan.Zero), 300m, categoryName: "Salary", note: "March"),
            new Transaction(Guid.NewGuid(), _userId, new DateTimeOffset(2025, 4, 1, 0, 0, 0, TimeSpan.Zero), 500m, categoryName: "Other", note: "Other book")
        );
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsTransaction_WhenExists()
    {
        var all = await _context.Transactions.ToListAsync();
        var first = all.First();

        var result = await _repository.GetByIdAsync(first.Id);

        Assert.NotNull(result);
        Assert.Equal(first.Id, result!.Id);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenNotExists()
    {
        var result = await _repository.GetByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task SearchAsync_FiltersByBookId()
    {
        var result = await _repository.SearchAsync(bookId: _bookId);

        Assert.Equal(4, result.Count);
    }

    [Fact]
    public async Task SearchAsync_FiltersByDateRange()
    {
        var from = new DateTimeOffset(2025, 1, 15, 0, 0, 0, TimeSpan.Zero);
        var to = new DateTimeOffset(2025, 2, 1, 0, 0, 0, TimeSpan.Zero);

        var result = await _repository.SearchAsync(bookId: _bookId, from: from, to: to);

        // Should include Jan 15 (>= from) and exclude Feb 1 (< to is false since Feb 1 < Feb 1 is false)
        Assert.Single(result);
        Assert.Equal(-50m, result[0].Amount);
    }

    [Fact]
    public async Task SearchAsync_IncludesFrom_ExcludesTo()
    {
        var from = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var to = new DateTimeOffset(2025, 2, 1, 0, 0, 0, TimeSpan.Zero);

        var result = await _repository.SearchAsync(bookId: _bookId, from: from, to: to);

        // Should include Jan 1 and Jan 15 (>= Jan 1, < Feb 1)
        // Feb 1 is excluded because to is exclusive
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task SearchAsync_FiltersByCategories()
    {
        var categories = new List<string> { "Food" };

        var result = await _repository.SearchAsync(bookId: _bookId, categories: categories);

        Assert.Equal(2, result.Count);
        Assert.All(result, t => Assert.Equal("Food", t.CategoryName));
    }

    [Fact]
    public async Task SearchAsync_FiltersByCreatedBy()
    {
        var createdBy = new List<Guid> { _otherUserId };

        var result = await _repository.SearchAsync(bookId: _bookId, createdBy: createdBy);

        Assert.Single(result);
    }

    [Fact]
    public async Task SearchAsync_FiltersByNoteSearch()
    {
        var result = await _repository.SearchAsync(bookId: _bookId, noteSearch: "Lunch");

        Assert.Single(result);
        Assert.Equal(100m, result[0].Amount);
    }

    [Fact]
    public async Task SearchAsync_FiltersByMinValue()
    {
        var result = await _repository.SearchAsync(bookId: _bookId, minValue: 200m);

        Assert.Equal(2, result.Count);
        Assert.All(result, t => Assert.True(t.Amount >= 200m));
    }

    [Fact]
    public async Task SearchAsync_FiltersByMaxValue()
    {
        var result = await _repository.SearchAsync(bookId: _bookId, maxValue: 100m);

        Assert.Equal(2, result.Count);
        Assert.All(result, t => Assert.True(t.Amount <= 100m));
    }

    [Fact]
    public async Task SearchAsync_SupportsPagination()
    {
        var result = await _repository.SearchAsync(bookId: _bookId, page: 1, pageSize: 2);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task SearchAsync_ReturnsSecondPage()
    {
        var result = await _repository.SearchAsync(bookId: _bookId, page: 2, pageSize: 2);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task SearchAsync_ReturnsEmpty_WhenPageExceedsResults()
    {
        var result = await _repository.SearchAsync(bookId: _bookId, page: 10, pageSize: 2);

        Assert.Empty(result);
    }

    [Fact]
    public async Task SearchAsync_OrdersByDateTimeDescending()
    {
        var result = await _repository.SearchAsync(bookId: _bookId);

        for (int i = 1; i < result.Count; i++)
        {
            Assert.True(result[i - 1].DateTime >= result[i].DateTime);
        }
    }

    [Fact]
    public async Task GetSearchCountAsync_ReturnsTotalCount()
    {
        var count = await _repository.GetSearchCountAsync(bookId: _bookId);

        Assert.Equal(4, count);
    }

    [Fact]
    public async Task GetSearchCountAsync_AppliesFilters()
    {
        var count = await _repository.GetSearchCountAsync(bookId: _bookId, categories: new List<string> { "Food" });

        Assert.Equal(2, count);
    }

    [Fact]
    public async Task AddAsync_PersistsTransaction()
    {
        var tx = new Transaction(_bookId, _userId, DateTimeOffset.UtcNow, 999m, categoryName: "Test");

        await _repository.AddAsync(tx);

        var saved = await _context.Transactions.FindAsync(tx.Id);
        Assert.NotNull(saved);
        Assert.Equal(999m, saved!.Amount);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesTransaction()
    {
        var all = await _context.Transactions.ToListAsync();
        var tx = all.First();
        var originalAmount = tx.Amount;

        tx.Update(tx.DateTime, 777m, null, null, null, "Updated", "Modified");
        await _repository.UpdateAsync(tx);

        var saved = await _context.Transactions.FindAsync(tx.Id);
        Assert.Equal(777m, saved!.Amount);
        Assert.Equal("Updated", saved.CategoryName);
        Assert.Equal("Modified", saved.Note);
    }

    [Fact]
    public async Task DeleteAsync_RemovesTransaction()
    {
        var all = await _context.Transactions.ToListAsync();
        var tx = all.First();

        await _repository.DeleteAsync(tx);

        var saved = await _context.Transactions.FindAsync(tx.Id);
        Assert.Null(saved);
    }

    [Fact]
    public async Task GetDailyReportAsync_GroupsByDate()
    {
        var from = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var to = new DateTimeOffset(2025, 12, 31, 0, 0, 0, TimeSpan.Zero);

        // Add another transaction on same date as first
        _context.Transactions.Add(new Transaction(
            _bookId, _userId, new DateTimeOffset(2025, 1, 1, 10, 0, 0, TimeSpan.Zero), 50m, categoryName: "Snacks"));
        await _context.SaveChangesAsync();

        var result = await _repository.GetDailyReportAsync(_bookId, from, to);

        // Should group Jan 1 transactions
        var jan1 = result.FirstOrDefault(r => r.Date == new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
        Assert.NotEqual(default, jan1);
        Assert.Equal(150m, jan1.Amount); // 100 + 50
    }

    [Fact]
    public async Task GetMonthlyReportAsync_GroupsByMonth()
    {
        var from = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var to = new DateTimeOffset(2025, 12, 31, 0, 0, 0, TimeSpan.Zero);

        var result = await _repository.GetMonthlyReportAsync(_bookId, from, to);

        Assert.Contains(result, r => r.Period == "2025-01");
        Assert.Contains(result, r => r.Period == "2025-03");
    }
}
