using ledger12.Domain;
using ledger12.Infrastructure.Data;
using ledger12.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace ledger12.Tests.Integration;

public class TransactionRepositoryTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly TransactionRepository _repository;

    public TransactionRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}")
            .Options;

        _context = new AppDbContext(options);
        _repository = new TransactionRepository(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task AddAsync_InsertsTransactionAndCreatesAggregateRows()
    {
        // Arrange
        var transaction = new Transaction(
            value: 100.50m,
            category: "Food",
            author: "Alice",
            date: new DateTimeOffset(2026, 5, 26, 12, 0, 0, TimeSpan.Zero)
        );

        // Act
        var result = await _repository.AddAsync(transaction);

        // Assert - transaction saved
        Assert.Equal(1, await _context.Transactions.CountAsync());

        // Assert - daily aggregate
        var daily = await _context.DailyAggregates.SingleAsync();
        Assert.Equal(new DateOnly(2026, 5, 26), daily.PeriodStart);
        Assert.Equal("Alice", daily.Author);
        Assert.Equal("Food", daily.Category);
        Assert.Equal("", daily.Book);
        Assert.Equal(100.50m, daily.SumValue);
        Assert.Equal(1, daily.TransactionCount);

        // Assert - weekly aggregate (May 26 2026 is a Tuesday, week starts Monday May 25)
        var weekly = await _context.WeeklyAggregates.SingleAsync();
        Assert.Equal(new DateOnly(2026, 5, 25), weekly.PeriodStart);
        Assert.Equal(100.50m, weekly.SumValue);
        Assert.Equal(1, weekly.TransactionCount);

        // Assert - monthly aggregate
        var monthly = await _context.MonthlyAggregates.SingleAsync();
        Assert.Equal(new DateOnly(2026, 5, 1), monthly.PeriodStart);
        Assert.Equal(100.50m, monthly.SumValue);
        Assert.Equal(1, monthly.TransactionCount);

        // Assert - yearly aggregate
        var yearly = await _context.YearlyAggregates.SingleAsync();
        Assert.Equal(new DateOnly(2026, 1, 1), yearly.PeriodStart);
        Assert.Equal(100.50m, yearly.SumValue);
        Assert.Equal(1, yearly.TransactionCount);
    }

    [Fact]
    public async Task AddAsync_MultipleTransactionsInSameBucket_AggregatesSumAndCount()
    {
        // Arrange
        var date = new DateTimeOffset(2026, 5, 26, 12, 0, 0, TimeSpan.Zero);

        var tx1 = new Transaction(100m, "Food", "Alice", date);
        var tx2 = new Transaction(50m, "Food", "Alice", date);

        // Act
        await _repository.AddAsync(tx1);
        await _repository.AddAsync(tx2);

        // Assert
        var daily = await _context.DailyAggregates.SingleAsync();
        Assert.Equal(150m, daily.SumValue);
        Assert.Equal(2, daily.TransactionCount);

        var weekly = await _context.WeeklyAggregates.SingleAsync();
        Assert.Equal(150m, weekly.SumValue);
        Assert.Equal(2, weekly.TransactionCount);

        var monthly = await _context.MonthlyAggregates.SingleAsync();
        Assert.Equal(150m, monthly.SumValue);
        Assert.Equal(2, monthly.TransactionCount);

        var yearly = await _context.YearlyAggregates.SingleAsync();
        Assert.Equal(150m, yearly.SumValue);
        Assert.Equal(2, yearly.TransactionCount);
    }

    [Fact]
    public async Task AddAsync_DifferentCategories_CreatesSeparateAggregateRows()
    {
        // Arrange
        var date = new DateTimeOffset(2026, 5, 26, 12, 0, 0, TimeSpan.Zero);

        var tx1 = new Transaction(100m, "Food", "Alice", date);
        var tx2 = new Transaction(200m, "Transport", "Alice", date);

        // Act
        await _repository.AddAsync(tx1);
        await _repository.AddAsync(tx2);

        // Assert - two daily aggregates (one per category)
        var dailyRows = await _context.DailyAggregates.OrderBy(a => a.Category).ToListAsync();
        Assert.Equal(2, dailyRows.Count);
        Assert.Equal("Food", dailyRows[0].Category);
        Assert.Equal(100m, dailyRows[0].SumValue);
        Assert.Equal(1, dailyRows[0].TransactionCount);
        Assert.Equal("Transport", dailyRows[1].Category);
        Assert.Equal(200m, dailyRows[1].SumValue);
        Assert.Equal(1, dailyRows[1].TransactionCount);
    }

    [Fact]
    public async Task AddAsync_DifferentAuthors_CreatesSeparateAggregateRows()
    {
        // Arrange
        var date = new DateTimeOffset(2026, 5, 26, 12, 0, 0, TimeSpan.Zero);

        var tx1 = new Transaction(100m, "Food", "Alice", date);
        var tx2 = new Transaction(50m, "Food", "Bob", date);

        // Act
        await _repository.AddAsync(tx1);
        await _repository.AddAsync(tx2);

        // Assert
        var dailyRows = await _context.DailyAggregates.OrderBy(a => a.Author).ToListAsync();
        Assert.Equal(2, dailyRows.Count);
        Assert.Equal("Alice", dailyRows[0].Author);
        Assert.Equal("Bob", dailyRows[1].Author);
    }

    [Fact]
    public async Task AddAsync_DifferentBooks_CreatesSeparateAggregateRows()
    {
        // Arrange
        var date = new DateTimeOffset(2026, 5, 26, 12, 0, 0, TimeSpan.Zero);

        var tx1 = new Transaction(100m, "Food", "Alice", date, book: "Personal");
        var tx2 = new Transaction(50m, "Food", "Alice", date, book: "Business");

        // Act
        await _repository.AddAsync(tx1);
        await _repository.AddAsync(tx2);

        // Assert
        var dailyRows = await _context.DailyAggregates.OrderBy(a => a.Book).ToListAsync();
        Assert.Equal(2, dailyRows.Count);
        Assert.Equal("Business", dailyRows[0].Book);
        Assert.Equal("Personal", dailyRows[1].Book);
    }

    [Fact]
    public async Task AddAsync_NullBook_DefaultsToEmptyStringInAggregate()
    {
        // Arrange
        var transaction = new Transaction(
            value: 100m,
            category: "Food",
            author: "Alice",
            date: new DateTimeOffset(2026, 5, 26, 12, 0, 0, TimeSpan.Zero),
            book: null // explicitly null
        );

        // Act
        await _repository.AddAsync(transaction);

        // Assert
        var daily = await _context.DailyAggregates.SingleAsync();
        Assert.Equal("", daily.Book);
    }

    [Fact]
    public async Task AddAsync_DifferentDates_CreatesSeparateDailyAggregateRows()
    {
        // Arrange
        var tx1 = new Transaction(100m, "Food", "Alice",
            new DateTimeOffset(2026, 5, 26, 12, 0, 0, TimeSpan.Zero));
        var tx2 = new Transaction(50m, "Food", "Alice",
            new DateTimeOffset(2026, 5, 27, 12, 0, 0, TimeSpan.Zero));

        // Act
        await _repository.AddAsync(tx1);
        await _repository.AddAsync(tx2);

        // Assert
        var dailyRows = await _context.DailyAggregates.OrderBy(a => a.PeriodStart).ToListAsync();
        Assert.Equal(2, dailyRows.Count);
        Assert.Equal(new DateOnly(2026, 5, 26), dailyRows[0].PeriodStart);
        Assert.Equal(100m, dailyRows[0].SumValue);
        Assert.Equal(new DateOnly(2026, 5, 27), dailyRows[1].PeriodStart);
        Assert.Equal(50m, dailyRows[1].SumValue);

        // But only one monthly and yearly aggregate
        Assert.Equal(1, await _context.MonthlyAggregates.CountAsync());
        Assert.Equal(150m, (await _context.MonthlyAggregates.SingleAsync()).SumValue);

        Assert.Equal(1, await _context.YearlyAggregates.CountAsync());
        Assert.Equal(150m, (await _context.YearlyAggregates.SingleAsync()).SumValue);
    }

    [Fact]
    public async Task AddAsync_TransactionCount_AccumulatesCorrectly()
    {
        // Arrange
        var date = new DateTimeOffset(2026, 5, 26, 12, 0, 0, TimeSpan.Zero);

        // Act - add three transactions
        await _repository.AddAsync(new Transaction(10m, "Food", "Alice", date));
        await _repository.AddAsync(new Transaction(20m, "Food", "Alice", date));
        await _repository.AddAsync(new Transaction(30m, "Food", "Alice", date));

        // Assert
        var daily = await _context.DailyAggregates.SingleAsync();
        Assert.Equal(3, daily.TransactionCount);
        Assert.Equal(60m, daily.SumValue);
    }

    [Fact]
    public async Task RebuildAggregatesAsync_DeletesOldAggregatesAndRebuildsFromTransactions()
    {
        // Arrange — seed transactions directly (bypassing AddAsync so no aggregates are created yet)
        var date1 = new DateTimeOffset(2026, 5, 26, 12, 0, 0, TimeSpan.Zero);
        var date2 = new DateTimeOffset(2026, 5, 27, 14, 0, 0, TimeSpan.Zero);

        _context.Transactions.AddRange(
            new Transaction(100m, "Food", "Alice", date1),
            new Transaction(50m,  "Food", "Alice", date1),
            new Transaction(200m, "Transport", "Bob", date2)
        );
        await _context.SaveChangesAsync();

        // Act
        await _repository.RebuildAggregatesAsync();

        // Assert — DailyAggregates (2 groups: Alice/Food on May 26, Bob/Transport on May 27)
        var dailyRows = await _context.DailyAggregates.OrderBy(a => a.PeriodStart).ThenBy(a => a.Category).ToListAsync();
        Assert.Equal(2, dailyRows.Count);

        // Alice/Food/USD on May 26 (2 transactions merged into one aggregate)
        var d1 = dailyRows[0];
        Assert.Equal(new DateOnly(2026, 5, 26), d1.PeriodStart);
        Assert.Equal("Alice", d1.Author);
        Assert.Equal("Food", d1.Category);
        Assert.Equal(150m, d1.SumValue);
        Assert.Equal(2, d1.TransactionCount);

        // Bob/Transport/EUR on May 27
        var d2 = dailyRows[1];
        Assert.Equal(new DateOnly(2026, 5, 27), d2.PeriodStart);
        Assert.Equal("Bob", d2.Author);
        Assert.Equal("Transport", d2.Category);
        Assert.Equal(200m, d2.SumValue);
        Assert.Equal(1, d2.TransactionCount);

        // Assert — WeeklyAggregates (May 26-27 both fall in week starting May 25)
        var weeklyRows = await _context.WeeklyAggregates.OrderBy(a => a.Category).ToListAsync();
        Assert.Equal(2, weeklyRows.Count);
        Assert.Equal(150m, weeklyRows.Single(a => a.Category == "Food").SumValue);
        Assert.Equal(200m, weeklyRows.Single(a => a.Category == "Transport").SumValue);

        // Assert — MonthlyAggregates
        var monthlyRows = await _context.MonthlyAggregates.ToListAsync();
        Assert.Equal(2, monthlyRows.Count);
        Assert.Equal(150m, monthlyRows.Single(a => a.Category == "Food").SumValue);
        Assert.Equal(200m, monthlyRows.Single(a => a.Category == "Transport").SumValue);

        // Assert — YearlyAggregates
        var yearlyRows = await _context.YearlyAggregates.ToListAsync();
        Assert.Equal(2, yearlyRows.Count);
        Assert.Equal(150m, yearlyRows.Single(a => a.Category == "Food").SumValue);
        Assert.Equal(200m, yearlyRows.Single(a => a.Category == "Transport").SumValue);
    }

    [Fact]
    public async Task RebuildAggregatesAsync_EmptyTransactionTable_ClearsAllAggregates()
    {
        // Arrange — seed stale aggregates
        _context.DailyAggregates.Add(new DailyAggregate(
            new DateOnly(2026, 5, 26), "", "Alice", "Food", 100m));
        await _context.SaveChangesAsync();

        Assert.NotEmpty(await _context.DailyAggregates.ToListAsync());

        // Act
        await _repository.RebuildAggregatesAsync();

        // Assert — all aggregate tables are empty
        Assert.Empty(await _context.DailyAggregates.ToListAsync());
        Assert.Empty(await _context.WeeklyAggregates.ToListAsync());
        Assert.Empty(await _context.MonthlyAggregates.ToListAsync());
        Assert.Empty(await _context.YearlyAggregates.ToListAsync());
    }
}
