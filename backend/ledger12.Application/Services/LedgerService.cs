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

    public async Task<Transaction?> GetTransactionByIdAsync(Guid id)
    {
        return await _repository.GetByIdAsync(id);
    }

    public async Task<PagedResult<Transaction>> GetTransactionsAsync(
        int page = 1,
        int pageSize = 20,
        string? book = null,
        string? author = null,
        string? category = null,
        string? currency = null)
    {
        return await _repository.GetAllAsync(page, pageSize, book, author, category, currency);
    }

    public async Task<Transaction> UpdateTransactionAsync(Guid id, UpdateTransactionDto dto)
    {
        var transaction = await _repository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Transaction with id '{id}' not found.");

        transaction.Update(
            dto.Value,
            dto.Currency,
            dto.Category,
            dto.Author,
            dto.Date,
            dto.Book
        );

        return await _repository.UpdateAsync(transaction);
    }

    public async Task DeleteTransactionAsync(Guid id)
    {
        var transaction = await _repository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Transaction with id '{id}' not found.");

        await _repository.DeleteAsync(transaction);
    }
}