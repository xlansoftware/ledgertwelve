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

    public async Task<Transaction> CreateTransactionAsync(CreateTransactionDto dto, string? currentUser = null)
    {
        var author = dto.Author ?? currentUser ?? throw new ArgumentException("Author must be provided either in the request or via an authenticated user.");
        var date = dto.Date ?? DateTimeOffset.UtcNow;

        var transaction = new Transaction(
            dto.Value,
            dto.Currency,
            dto.Category,
            author,
            date,
            dto.Book
        );

        return await _repository.AddAsync(transaction);
    }
}