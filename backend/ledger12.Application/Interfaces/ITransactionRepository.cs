using ledger12.Application.DTOs;
using ledger12.Domain;

namespace ledger12.Application.Interfaces;

public interface ITransactionRepository
{
    Task<Transaction> AddAsync(Transaction transaction);

    Task<PagedResult<T>> GetAggregatesAsync<T>(Granularity granularity, AggregateFilter filter)
        where T : class, IAggregateEntity;
}