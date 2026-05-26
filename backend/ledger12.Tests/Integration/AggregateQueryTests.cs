using ledger12.Application.DTOs;
using ledger12.Domain;
using ledger12.Infrastructure.Data;
using ledger12.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace ledger12.Tests.Integration;

public class AggregateQueryTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly TransactionRepository _repository;

    public AggregateQueryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}")
            .Options;

        _context = new AppDbContext(options);
        _repository = new TransactionRepository(_context);

        SeedAggregates();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    private void SeedAggregates()
    {
        var baseDate = new DateOnly(2026, 5, 25); // Monday (ISO week start)

        // Daily aggregates for May 25–30
        for (int day = 0; day < 6; day++)
        {
            var date = baseDate.AddDays(day);
            _context.DailyAggregates.Add(new DailyAggregate(date, "Personal", "Alice", "Food", "USD", 50m + day * 10));
            _context.DailyAggregates.Add(new DailyAggregate(date, "Business", "Alice", "Transport", "USD", 100m + day * 20));
            _context.DailyAggregates.Add(new DailyAggregate(date, "Personal", "Bob", "Food", "USD", 30m + day * 5));
        }

        // Weekly aggregates for weeks starting May 25 and June 1
        _context.WeeklyAggregates.Add(new WeeklyAggregate(new DateOnly(2026, 5, 25), "Personal", "Alice", "Food", "USD", 500m));
        _context.WeeklyAggregates.Add(new WeeklyAggregate(new DateOnly(2026, 5, 25), "Business", "Alice", "Transport", "USD", 1000m));
        _context.WeeklyAggregates.Add(new WeeklyAggregate(new DateOnly(2026, 6, 1), "Personal", "Alice", "Food", "USD", 300m));

        // Monthly aggregates for May and June
        _context.MonthlyAggregates.Add(new MonthlyAggregate(new DateOnly(2026, 5, 1), "Personal", "Alice", "Food", "USD", 2000m));
        _context.MonthlyAggregates.Add(new MonthlyAggregate(new DateOnly(2026, 5, 1), "Business", "Alice", "Transport", "USD", 4000m));
        _context.MonthlyAggregates.Add(new MonthlyAggregate(new DateOnly(2026, 6, 1), "Personal", "Alice", "Food", "USD", 500m));

        // Yearly aggregates
        _context.YearlyAggregates.Add(new YearlyAggregate(new DateOnly(2025, 1, 1), "Personal", "Alice", "Food", "USD", 12000m));
        _context.YearlyAggregates.Add(new YearlyAggregate(new DateOnly(2026, 1, 1), "Personal", "Alice", "Food", "USD", 6000m));

        _context.SaveChanges();
    }

    private static AggregateFilter Filter(
        DateOnly? from = null,
        DateOnly? to = null,
        string? book = null,
        string? author = null,
        string? category = null,
        string? currency = null,
        int page = 1,
        int pageSize = 20)
    {
        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        return new AggregateFilter(
            from ?? now.AddDays(-365),
            to ?? now,
            book, author, category, currency, page, pageSize
        );
    }

    // ─── Daily aggregates ────────────────────────────────────────────────

    [Fact]
    public async Task GetAggregatesAsync_ReturnsDailyAggregates()
    {
        // Arrange
        var filter = Filter(from: new DateOnly(2026, 5, 25), to: new DateOnly(2026, 5, 30));

        // Act
        var result = await _repository.GetAggregatesAsync<DailyAggregate>(Granularity.Daily, filter);

        // Assert - 6 days × 3 combos = 18 rows
        Assert.Equal(18, result.TotalCount);
        Assert.Equal(18, result.Items.Count);
        Assert.All(result.Items, item => Assert.IsType<DailyAggregate>(item));
    }

    [Fact]
    public async Task GetAggregatesAsync_FiltersDailyByDateRange()
    {
        // Arrange — only May 25–26
        var filter = Filter(from: new DateOnly(2026, 5, 25), to: new DateOnly(2026, 5, 26));

        // Act
        var result = await _repository.GetAggregatesAsync<DailyAggregate>(Granularity.Daily, filter);

        // Assert — 2 days × 3 combos = 6 rows
        Assert.Equal(6, result.TotalCount);
        Assert.All(result.Items, item =>
            Assert.InRange(item.PeriodStart, new DateOnly(2026, 5, 25), new DateOnly(2026, 5, 26)));
    }

    [Fact]
    public async Task GetAggregatesAsync_FiltersDailyByBook()
    {
        // Arrange
        var filter = Filter(from: new DateOnly(2026, 5, 25), to: new DateOnly(2026, 5, 30), book: "Business");

        // Act
        var result = await _repository.GetAggregatesAsync<DailyAggregate>(Granularity.Daily, filter);

        // Assert — 6 days × 1 combo (Alice/Transport/Business)
        Assert.Equal(6, result.TotalCount);
        Assert.All(result.Items, item => Assert.Equal("Business", item.Book));
    }

    [Fact]
    public async Task GetAggregatesAsync_FiltersDailyByAuthor()
    {
        // Arrange
        var filter = Filter(from: new DateOnly(2026, 5, 25), to: new DateOnly(2026, 5, 30), author: "Bob");

        // Act
        var result = await _repository.GetAggregatesAsync<DailyAggregate>(Granularity.Daily, filter);

        // Assert — 6 days × 1 combo (Bob/Food/Personal)
        Assert.Equal(6, result.TotalCount);
        Assert.All(result.Items, item => Assert.Equal("Bob", item.Author));
    }

    [Fact]
    public async Task GetAggregatesAsync_FiltersDailyByCategory()
    {
        // Arrange
        var filter = Filter(from: new DateOnly(2026, 5, 25), to: new DateOnly(2026, 5, 30), category: "Transport");

        // Act
        var result = await _repository.GetAggregatesAsync<DailyAggregate>(Granularity.Daily, filter);

        // Assert — 6 days × 1 combo (Alice/Transport/Business)
        Assert.Equal(6, result.TotalCount);
        Assert.All(result.Items, item => Assert.Equal("Transport", item.Category));
    }

    [Fact]
    public async Task GetAggregatesAsync_FiltersDailyByCurrency()
    {
        // Arrange — only USD exists in seed, so same as unfiltered
        var filter = Filter(from: new DateOnly(2026, 5, 25), to: new DateOnly(2026, 5, 30), currency: "USD");

        // Act
        var result = await _repository.GetAggregatesAsync<DailyAggregate>(Granularity.Daily, filter);

        // Assert
        Assert.Equal(18, result.TotalCount);
    }

    [Fact]
    public async Task GetAggregatesAsync_FiltersDailyByCombinedCriteria()
    {
        // Arrange
        var filter = Filter(
            from: new DateOnly(2026, 5, 25),
            to: new DateOnly(2026, 5, 27),
            book: "Personal",
            author: "Alice",
            category: "Food"
        );

        // Act
        var result = await _repository.GetAggregatesAsync<DailyAggregate>(Granularity.Daily, filter);

        // Assert — 3 days × 1 combo
        Assert.Equal(3, result.TotalCount);
        Assert.All(result.Items, item =>
        {
            Assert.Equal("Personal", item.Book);
            Assert.Equal("Alice", item.Author);
            Assert.Equal("Food", item.Category);
        });
    }

    [Fact]
    public async Task GetAggregatesAsync_ReturnsEmpty_WhenNoDailyMatch()
    {
        // Arrange
        var filter = Filter(from: new DateOnly(2024, 1, 1), to: new DateOnly(2024, 1, 31));

        // Act
        var result = await _repository.GetAggregatesAsync<DailyAggregate>(Granularity.Daily, filter);

        // Assert
        Assert.Empty(result.Items);
        Assert.Equal(0, result.TotalCount);
    }

    [Fact]
    public async Task GetAggregatesAsync_PaginatesDaily()
    {
        // Arrange — 18 rows total
        var filter = Filter(from: new DateOnly(2026, 5, 25), to: new DateOnly(2026, 5, 30), page: 1, pageSize: 5);

        // Act
        var result = await _repository.GetAggregatesAsync<DailyAggregate>(Granularity.Daily, filter);

        // Assert
        Assert.Equal(5, result.Items.Count);
        Assert.Equal(18, result.TotalCount);
        Assert.Equal(1, result.Page);
        Assert.Equal(5, result.PageSize);

        // Second page
        var filter2 = filter with { Page = 2 };
        var result2 = await _repository.GetAggregatesAsync<DailyAggregate>(Granularity.Daily, filter2);
        Assert.Equal(5, result2.Items.Count);
        Assert.Equal(18, result2.TotalCount);

        // Third page — 8 remaining
        var filter3 = filter2 with { Page = 4 };
        var result3 = await _repository.GetAggregatesAsync<DailyAggregate>(Granularity.Daily, filter3);
        Assert.Equal(3, result3.Items.Count);
    }

    [Fact]
    public async Task GetAggregatesAsync_OrdersDailyByPeriodStart()
    {
        // Arrange
        var filter = Filter(from: new DateOnly(2026, 5, 25), to: new DateOnly(2026, 5, 30), page: 1, pageSize: 20);

        // Act
        var result = await _repository.GetAggregatesAsync<DailyAggregate>(Granularity.Daily, filter);

        // Assert — each item's PeriodStart should be >= the previous
        for (int i = 1; i < result.Items.Count; i++)
        {
            Assert.True(result.Items[i].PeriodStart >= result.Items[i - 1].PeriodStart);
        }
    }

    // ─── Weekly aggregates ───────────────────────────────────────────────

    [Fact]
    public async Task GetAggregatesAsync_ReturnsWeeklyAggregates()
    {
        // Arrange
        var filter = Filter(from: new DateOnly(2026, 5, 25), to: new DateOnly(2026, 6, 7));

        // Act
        var result = await _repository.GetAggregatesAsync<WeeklyAggregate>(Granularity.Weekly, filter);

        // Assert
        Assert.Equal(3, result.TotalCount);
        Assert.All(result.Items, item => Assert.IsType<WeeklyAggregate>(item));
    }

    [Fact]
    public async Task GetAggregatesAsync_FiltersWeeklyByDateRange()
    {
        // Arrange
        var filter = Filter(from: new DateOnly(2026, 5, 25), to: new DateOnly(2026, 5, 31));

        // Act
        var result = await _repository.GetAggregatesAsync<WeeklyAggregate>(Granularity.Weekly, filter);

        // Assert — only week starting May 25
        Assert.Equal(2, result.TotalCount);
        Assert.All(result.Items, item => Assert.Equal(new DateOnly(2026, 5, 25), item.PeriodStart));
    }

    // ─── Monthly aggregates ──────────────────────────────────────────────

    [Fact]
    public async Task GetAggregatesAsync_ReturnsMonthlyAggregates()
    {
        // Arrange
        var filter = Filter(from: new DateOnly(2026, 5, 1), to: new DateOnly(2026, 6, 30));

        // Act
        var result = await _repository.GetAggregatesAsync<MonthlyAggregate>(Granularity.Monthly, filter);

        // Assert
        Assert.Equal(3, result.TotalCount);
        Assert.All(result.Items, item => Assert.IsType<MonthlyAggregate>(item));
    }

    [Fact]
    public async Task GetAggregatesAsync_FiltersMonthlyByDateRange()
    {
        // Arrange
        var filter = Filter(from: new DateOnly(2026, 5, 1), to: new DateOnly(2026, 5, 31));

        // Act
        var result = await _repository.GetAggregatesAsync<MonthlyAggregate>(Granularity.Monthly, filter);

        // Assert — only May
        Assert.Equal(2, result.TotalCount);
        Assert.All(result.Items, item => Assert.Equal(new DateOnly(2026, 5, 1), item.PeriodStart));
    }

    // ─── Yearly aggregates ───────────────────────────────────────────────

    [Fact]
    public async Task GetAggregatesAsync_ReturnsYearlyAggregates()
    {
        // Arrange
        var filter = Filter(from: new DateOnly(2024, 1, 1), to: new DateOnly(2026, 12, 31));

        // Act
        var result = await _repository.GetAggregatesAsync<YearlyAggregate>(Granularity.Yearly, filter);

        // Assert
        Assert.Equal(2, result.TotalCount);
        Assert.All(result.Items, item => Assert.IsType<YearlyAggregate>(item));
    }

    [Fact]
    public async Task GetAggregatesAsync_FiltersYearlyByDateRange()
    {
        // Arrange
        var filter = Filter(from: new DateOnly(2026, 1, 1), to: new DateOnly(2026, 12, 31));

        // Act
        var result = await _repository.GetAggregatesAsync<YearlyAggregate>(Granularity.Yearly, filter);

        // Assert — only 2026
        Assert.Single(result.Items);
        Assert.Equal(new DateOnly(2026, 1, 1), result.Items[0].PeriodStart);
        Assert.Equal(6000m, result.Items[0].SumValue);
    }
}