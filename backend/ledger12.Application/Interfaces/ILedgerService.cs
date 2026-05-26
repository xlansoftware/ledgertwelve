using ledger12.Application.DTOs;
using ledger12.Domain;

namespace ledger12.Application.Interfaces;

public interface ILedgerService
{
    Task<Transaction> CreateTransactionAsync(CreateTransactionDto dto, string? currentUser = null);
}