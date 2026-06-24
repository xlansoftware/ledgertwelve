using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Domain.Exceptions;

namespace ledger12.Application.Services;

public class ReportService : IReportService
{
    private readonly ITransactionRepository _transactionRepo;
    private readonly IBookRepository _bookRepo;

    public ReportService(ITransactionRepository transactionRepo, IBookRepository bookRepo)
    {
        _transactionRepo = transactionRepo;
        _bookRepo = bookRepo;
    }

    private async Task<Guid> GetMainBookId(Guid userId)
    {
        var mainBook = await _bookRepo.GetMainBookAsync(userId);
        if (mainBook == null) throw new NotFoundException("Main book", "not found");
        return mainBook.Id;
    }

    public async Task<List<TotalsReportItem>> GetTotalsReportAsync(
        string? period, DateTimeOffset? from, DateTimeOffset? to, Guid userId)
    {
        var mainBookId = await GetMainBookId(userId);
        var items = await _transactionRepo.GetTotalsReportAsync(mainBookId, period, from, to);
        return items.Select(i => new TotalsReportItem(i.Period, i.Income, i.Expense, i.Income + i.Expense)).ToList();
    }

    public async Task<List<CategoryReportItem>> GetCategoryReportAsync(
        DateTimeOffset? from, DateTimeOffset? to, Guid userId)
    {
        var mainBookId = await GetMainBookId(userId);
        var items = await _transactionRepo.GetCategoryReportAsync(mainBookId, from, to);
        return items.Select(i => new CategoryReportItem(i.CategoryName, Math.Round(i.Amount, 2))).ToList();
    }

    public async Task<List<DailyReportItem>> GetDailyReportAsync(DateTimeOffset from, DateTimeOffset to, Guid userId)
    {
        var mainBookId = await GetMainBookId(userId);
        var items = await _transactionRepo.GetDailyReportAsync(mainBookId, from, to);
        return items.Select(i => new DailyReportItem(i.Date.ToString("yyyy-MM-dd"), i.Amount)).ToList();
    }

    public async Task<List<MonthlyReportItem>> GetMonthlyReportAsync(DateTimeOffset from, DateTimeOffset to, Guid userId)
    {
        var mainBookId = await GetMainBookId(userId);
        var items = await _transactionRepo.GetMonthlyReportAsync(mainBookId, from, to);
        return items.Select(i => new MonthlyReportItem(i.Period, i.Amount)).ToList();
    }

    public async Task<AverageReportItem> GetAverageDailyAsync(DateTimeOffset from, DateTimeOffset to, Guid userId)
    {
        if (from >= to) throw new DomainException("from must be before to");
        var mainBookId = await GetMainBookId(userId);
        var items = await _transactionRepo.GetDailyReportAsync(mainBookId, from, to);

        if (items.Count == 0) return new AverageReportItem(0, 0);

        var total = items.Sum(i => i.Amount);
        var average = Math.Round(total / items.Count, 2);
        return new AverageReportItem(average, items.Count);
    }

    public async Task<AverageReportItem> GetAverageMonthlyAsync(DateTimeOffset from, DateTimeOffset to, Guid userId)
    {
        if (from >= to) throw new DomainException("from must be before to");
        var mainBookId = await GetMainBookId(userId);
        var items = await _transactionRepo.GetMonthlyReportAsync(mainBookId, from, to);

        if (items.Count == 0) return new AverageReportItem(0, 0);

        var total = items.Sum(i => i.Amount);
        var average = Math.Round(total / items.Count, 2);
        return new AverageReportItem(average, items.Count);
    }
}
