using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Domain.Entities;
using ledger12.Domain.Exceptions;

namespace ledger12.Application.Services;

public class TransactionService : ITransactionService
{
    private readonly ITransactionRepository _transactionRepo;
    private readonly IBookRepository _bookRepo;

    public TransactionService(ITransactionRepository transactionRepo, IBookRepository bookRepo)
    {
        _transactionRepo = transactionRepo;
        _bookRepo = bookRepo;
    }

    public async Task<PagedResponse<TransactionDto>> SearchAsync(
        Guid? bookId, DateTimeOffset? from, DateTimeOffset? to,
        List<string>? categories, List<Guid>? createdBy, string? note,
        decimal? minValue, decimal? maxValue, int page, int pageSize,
        Guid userId)
    {
        if (bookId.HasValue)
        {
            var visible = await _bookRepo.IsVisibleAsync(bookId.Value, userId);
            if (!visible) throw new NotFoundException("Book", bookId.Value);
        }

        var transactions = await _transactionRepo.SearchAsync(
            bookId, from, to, categories, createdBy, note, minValue, maxValue, page, pageSize);
        var total = await _transactionRepo.GetSearchCountAsync(
            bookId, from, to, categories, createdBy, note, minValue, maxValue);

        var dtos = transactions.Select(MapToDto).ToList();
        return new PagedResponse<TransactionDto>(dtos, new Meta(page, pageSize, total));
    }

    public async Task<TransactionDto> GetByIdAsync(Guid id, Guid userId)
    {
        var tx = await _transactionRepo.GetByIdAsync(id);
        if (tx == null) throw new NotFoundException("Transaction", id);

        var visible = await _bookRepo.IsVisibleAsync(tx.BookId, userId);
        if (!visible) throw new NotFoundException("Transaction", id);

        return MapToDto(tx);
    }

    public async Task<TransactionDto> CreateAsync(CreateTransactionRequest request, Guid userId)
    {
        var visible = await _bookRepo.HasEditAccessAsync(request.BookId, userId);
        if (!visible) throw new NotFoundException("Book", request.BookId);

        var tx = new Transaction(
            request.BookId, userId, request.DateTime, request.Amount,
            request.OriginalCurrency, request.OriginalAmount, request.ExchangeRate,
            request.CategoryName, request.Note
        );
        await _transactionRepo.AddAsync(tx);
        return MapToDto(tx);
    }

    public async Task<TransactionDto> UpdateAsync(Guid id, UpdateTransactionRequest request, Guid userId)
    {
        var tx = await _transactionRepo.GetByIdAsync(id);
        if (tx == null) throw new NotFoundException("Transaction", id);

        var canEdit = await _bookRepo.HasEditAccessAsync(tx.BookId, userId);
        if (!canEdit) throw new NotFoundException("Transaction", id);

        tx.Update(request.DateTime, request.Amount, request.OriginalCurrency, request.OriginalAmount,
                   request.ExchangeRate, request.CategoryName, request.Note);
        await _transactionRepo.UpdateAsync(tx);
        return MapToDto(tx);
    }

    public async Task<DeleteTransactionResponse> DeleteAsync(Guid id, Guid userId)
    {
        var tx = await _transactionRepo.GetByIdAsync(id);
        if (tx == null) throw new NotFoundException("Transaction", id);

        var canEdit = await _bookRepo.HasEditAccessAsync(tx.BookId, userId);
        if (!canEdit) throw new NotFoundException("Transaction", id);

        await _transactionRepo.DeleteAsync(tx);
        return new DeleteTransactionResponse(true);
    }

    internal static TransactionDto MapToDto(Transaction tx) => new(
        tx.Id.ToString(),
        tx.BookId.ToString(),
        tx.UserId.ToString(),
        tx.DateTime.ToString("o"),
        tx.Amount,
        tx.OriginalCurrency,
        tx.OriginalAmount,
        tx.ExchangeRate,
        tx.CategoryName,
        tx.Note,
        tx.CreatedAt.ToString("o"),
        tx.IsBookClosingEntry,
        tx.ClosedBookId?.ToString()
    );
}
