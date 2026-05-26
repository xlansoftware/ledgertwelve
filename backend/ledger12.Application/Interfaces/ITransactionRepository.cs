using ledger12.Application.DTOs;
using ledger12.Domain;

namespace ledger12.Application.Interfaces;

public interface ITransactionRepository
{
    Task<Transaction> AddAsync(Transaction transaction);

    Task<Transaction?> GetByIdAsync(Guid id);

    Task<PagedResult<Transaction>> GetAllAsync(
        int page = 1,
        int pageSize = 20,
        string? book = null,
        string? author = null,
        string? category = null,
        string? currency = null);

    Task<Transaction> UpdateAsync(Transaction transaction);

    Task DeleteAsync(Transaction transaction);

    Task<PagedResult<T>> GetAggregatesAsync<T>(Granularity granularity, AggregateFilter filter)
        where T : class, IAggregateEntity;

    Task RebuildAggregatesAsync();
}