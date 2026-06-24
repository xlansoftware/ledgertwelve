using Moq;
using ledger12.Application.Interfaces;
using ledger12.Application.Services;
using ledger12.Domain.Entities;
using ledger12.Domain.Exceptions;

namespace ledger12.Tests.Unit.Application;

public class ReportServiceTests
{
    private readonly Mock<ITransactionRepository> _transactionRepo;
    private readonly Mock<IBookRepository> _bookRepo;
    private readonly ReportService _service;
    private readonly Guid _userId = Guid.NewGuid();

    public ReportServiceTests()
    {
        _transactionRepo = new Mock<ITransactionRepository>();
        _bookRepo = new Mock<IBookRepository>();
        _service = new ReportService(_transactionRepo.Object, _bookRepo.Object);
    }

    private Book SetupMainBook()
    {
        var mainBook = new Book("Main", _userId, "EUR");
        _bookRepo.Setup(r => r.GetMainBookAsync(_userId)).ReturnsAsync(mainBook);
        return mainBook;
    }

    [Fact]
    public async Task GetTotalsReportAsync_ReturnsItems_WhenMainBookExists()
    {
        var mainBook = SetupMainBook();
        var reportItems = new List<(string Period, decimal Income, decimal Expense)>
        {
            ("2025-01", 1000m, -200m),
            ("2025-02", 1500m, -300m),
        };
        _transactionRepo.Setup(r => r.GetTotalsReportAsync(mainBook.Id, "month", null, null))
            .ReturnsAsync(reportItems);

        var result = await _service.GetTotalsReportAsync("month", null, null, _userId);

        Assert.Equal(2, result.Count);
        Assert.Equal(1000m, result[0].Income);
        Assert.Equal(-200m, result[0].Expense);
        Assert.Equal(800m, result[0].Net); // Income + Expense
    }

    [Fact]
    public async Task GetCategoryReportAsync_ReturnsItems()
    {
        var mainBook = SetupMainBook();
        var reportItems = new List<(string CategoryName, decimal Amount)>
        {
            ("Food", -500m),
            ("Salary", 3000m),
        };
        _transactionRepo.Setup(r => r.GetCategoryReportAsync(mainBook.Id, null, null))
            .ReturnsAsync(reportItems);

        var result = await _service.GetCategoryReportAsync(null, null, _userId);

        Assert.Equal(2, result.Count);
        Assert.Equal(-500m, result[0].Amount);
    }

    [Fact]
    public async Task GetDailyReportAsync_ReturnsItems()
    {
        var mainBook = SetupMainBook();
        var from = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var to = new DateTimeOffset(2025, 1, 31, 0, 0, 0, TimeSpan.Zero);
        var reportItems = new List<(DateTimeOffset Date, decimal Amount)>
        {
            (new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero), 100m),
            (new DateTimeOffset(2025, 1, 2, 0, 0, 0, TimeSpan.Zero), -50m),
        };
        _transactionRepo.Setup(r => r.GetDailyReportAsync(mainBook.Id, from, to))
            .ReturnsAsync(reportItems);

        var result = await _service.GetDailyReportAsync(from, to, _userId);

        Assert.Equal(2, result.Count);
        Assert.Equal("2025-01-01", result[0].Date);
    }

    [Fact]
    public async Task GetMonthlyReportAsync_ReturnsItems()
    {
        var mainBook = SetupMainBook();
        var from = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var to = new DateTimeOffset(2025, 12, 31, 0, 0, 0, TimeSpan.Zero);
        var reportItems = new List<(string Period, decimal Amount)>
        {
            ("2025-01", 500m),
            ("2025-02", -100m),
        };
        _transactionRepo.Setup(r => r.GetMonthlyReportAsync(mainBook.Id, from, to))
            .ReturnsAsync(reportItems);

        var result = await _service.GetMonthlyReportAsync(from, to, _userId);

        Assert.Equal(2, result.Count);
        Assert.Equal("2025-01", result[0].Period);
    }

    [Fact]
    public async Task GetAverageDailyAsync_ReturnsAverage()
    {
        var mainBook = SetupMainBook();
        var from = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var to = new DateTimeOffset(2025, 1, 31, 0, 0, 0, TimeSpan.Zero);
        var reportItems = new List<(DateTimeOffset Date, decimal Amount)>
        {
            (new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero), 100m),
            (new DateTimeOffset(2025, 1, 2, 0, 0, 0, TimeSpan.Zero), 200m),
        };
        _transactionRepo.Setup(r => r.GetDailyReportAsync(mainBook.Id, from, to))
            .ReturnsAsync(reportItems);

        var result = await _service.GetAverageDailyAsync(from, to, _userId);

        Assert.Equal(150m, result.Average);
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetAverageDailyAsync_ReturnsZero_WhenNoTransactions()
    {
        var mainBook = SetupMainBook();
        var from = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var to = new DateTimeOffset(2025, 1, 31, 0, 0, 0, TimeSpan.Zero);
        _transactionRepo.Setup(r => r.GetDailyReportAsync(mainBook.Id, from, to))
            .ReturnsAsync(new List<(DateTimeOffset, decimal)>());

        var result = await _service.GetAverageDailyAsync(from, to, _userId);

        Assert.Equal(0, result.Average);
        Assert.Equal(0, result.Count);
    }

    [Fact]
    public async Task GetAverageDailyAsync_ThrowsDomainException_WhenFromAfterTo()
    {
        SetupMainBook();
        var from = new DateTimeOffset(2025, 6, 1, 0, 0, 0, TimeSpan.Zero);
        var to = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);

        await Assert.ThrowsAsync<DomainException>(() => _service.GetAverageDailyAsync(from, to, _userId));
    }

    [Fact]
    public async Task GetAverageMonthlyAsync_ReturnsAverage()
    {
        var mainBook = SetupMainBook();
        var from = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var to = new DateTimeOffset(2025, 12, 31, 0, 0, 0, TimeSpan.Zero);
        var reportItems = new List<(string Period, decimal Amount)>
        {
            ("2025-01", 1000m),
            ("2025-02", 2000m),
        };
        _transactionRepo.Setup(r => r.GetMonthlyReportAsync(mainBook.Id, from, to))
            .ReturnsAsync(reportItems);

        var result = await _service.GetAverageMonthlyAsync(from, to, _userId);

        Assert.Equal(1500m, result.Average);
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetAverageMonthlyAsync_ThrowsDomainException_WhenFromAfterTo()
    {
        SetupMainBook();
        var from = new DateTimeOffset(2025, 6, 1, 0, 0, 0, TimeSpan.Zero);
        var to = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);

        await Assert.ThrowsAsync<DomainException>(() => _service.GetAverageMonthlyAsync(from, to, _userId));
    }

    [Fact]
    public async Task GetTotalsReportAsync_ThrowsNotFoundException_WhenNoMainBook()
    {
        _bookRepo.Setup(r => r.GetMainBookAsync(_userId)).ReturnsAsync((Book?)null);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _service.GetTotalsReportAsync(null, null, null, _userId));
    }
}
