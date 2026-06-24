using ledger12.Domain.Entities;

namespace ledger12.Application.Interfaces;

public interface ITransactionRepository
{
    Task<Transaction?> GetByIdAsync(Guid id);
    Task<List<Transaction>> SearchAsync(
        Guid? bookId = null,
        DateTimeOffset? from = null,
        DateTimeOffset? to = null,
        List<string>? categories = null,
        List<Guid>? createdBy = null,
        string? noteSearch = null,
        decimal? minValue = null,
        decimal? maxValue = null,
        int page = 1,
        int pageSize = 50
    );
    Task<int> GetSearchCountAsync(
        Guid? bookId = null,
        DateTimeOffset? from = null,
        DateTimeOffset? to = null,
        List<string>? categories = null,
        List<Guid>? createdBy = null,
        string? noteSearch = null,
        decimal? minValue = null,
        decimal? maxValue = null
    );
    Task AddAsync(Transaction transaction);
    Task UpdateAsync(Transaction transaction);
    Task DeleteAsync(Transaction transaction);
    Task<int> GetTransactionCountForCategoryAsync(string categoryName, Guid userId);
    Task UpdateCategoryNameAsync(string oldName, string newName, Guid userId);

    // Report queries
    Task<List<(string Period, decimal Income, decimal Expense)>> GetTotalsReportAsync(
        Guid bookId, string? period, DateTimeOffset? from, DateTimeOffset? to
    );
    Task<List<(string CategoryName, decimal Amount)>> GetCategoryReportAsync(
        Guid bookId, DateTimeOffset? from, DateTimeOffset? to
    );
    Task<List<(DateTimeOffset Date, decimal Amount)>> GetDailyReportAsync(
        Guid bookId, DateTimeOffset from, DateTimeOffset to
    );
    Task<List<(string Period, decimal Amount)>> GetMonthlyReportAsync(
        Guid bookId, DateTimeOffset from, DateTimeOffset to
    );
}
