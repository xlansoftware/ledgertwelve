using ledger12.Application.DTOs;
using ledger12.Domain;

namespace ledger12.Application.Interfaces;

public interface ILedgerService
{
    Task<Transaction> CreateTransactionAsync(CreateTransactionDto dto, string? currentUser = null);

    Task<Transaction?> GetTransactionByIdAsync(Guid id);

    Task<PagedResult<Transaction>> GetTransactionsAsync(
        int page = 1,
        int pageSize = 20,
        string? book = null,
        string? author = null,
        string? category = null,
        string? currency = null);

    Task<Transaction> UpdateTransactionAsync(Guid id, UpdateTransactionDto dto);

    Task DeleteTransactionAsync(Guid id);
}