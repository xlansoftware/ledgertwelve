using ledger12.Domain;

namespace ledger12.Application.Interfaces;

public interface ITransactionRepository
{
    Task<Transaction> AddAsync(Transaction transaction);
}