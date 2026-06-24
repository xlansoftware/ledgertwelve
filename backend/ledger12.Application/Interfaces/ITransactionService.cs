using ledger12.Application.DTOs;

namespace ledger12.Application.Interfaces;

public interface ITransactionService
{
    Task<PagedResponse<TransactionDto>> SearchAsync(
        Guid? bookId, DateTimeOffset? from, DateTimeOffset? to,
        List<string>? categories, List<Guid>? createdBy, string? note,
        decimal? minValue, decimal? maxValue, int page, int pageSize,
        Guid userId
    );
    Task<TransactionDto> GetByIdAsync(Guid id, Guid userId);
    Task<TransactionDto> CreateAsync(CreateTransactionRequest request, Guid userId);
    Task<TransactionDto> UpdateAsync(Guid id, UpdateTransactionRequest request, Guid userId);
    Task<DeleteTransactionResponse> DeleteAsync(Guid id, Guid userId);
}
