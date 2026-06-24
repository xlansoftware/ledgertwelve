using ledger12.Application.DTOs;

namespace ledger12.Application.Interfaces;

public interface IReportService
{
    Task<List<TotalsReportItem>> GetTotalsReportAsync(string? period, DateTimeOffset? from, DateTimeOffset? to, Guid userId);
    Task<List<CategoryReportItem>> GetCategoryReportAsync(DateTimeOffset? from, DateTimeOffset? to, Guid userId);
    Task<List<DailyReportItem>> GetDailyReportAsync(DateTimeOffset from, DateTimeOffset to, Guid userId);
    Task<List<MonthlyReportItem>> GetMonthlyReportAsync(DateTimeOffset from, DateTimeOffset to, Guid userId);
    Task<AverageReportItem> GetAverageDailyAsync(DateTimeOffset from, DateTimeOffset to, Guid userId);
    Task<AverageReportItem> GetAverageMonthlyAsync(DateTimeOffset from, DateTimeOffset to, Guid userId);
}
