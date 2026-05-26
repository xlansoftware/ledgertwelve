using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Domain;

namespace ledger12.Application.Services;

public class LedgerService : ILedgerService
{
    private readonly ITransactionRepository _repository;

    public LedgerService(ITransactionRepository repository)
    {
        _repository = repository;
    }

    public async Task<Transaction> CreateTransactionAsync(CreateTransactionDto dto)
    {
        var transaction = new Transaction(
            dto.Value,
            dto.Currency,
            dto.Category,
            dto.Author,
            dto.Date
        );

        return await _repository.AddAsync(transaction);
    }
}