using ledger12.Application.DTOs;
using ledger12.Domain.Entities;

namespace ledger12.Application.Interfaces;

public interface IBookService
{
    Task<List<BookDto>> GetBooksAsync(Guid userId);
    Task<BookDto> GetBookAsync(Guid bookId, Guid userId);
    Task<BookDto> CreateBookAsync(CreateBookRequest request, Guid userId);
    Task<BookDto> UpdateBookAsync(Guid bookId, UpdateBookRequest request, Guid userId);
    Task DeleteBookAsync(Guid bookId, Guid userId);
    Task<BookStatsResponse> GetBookStatsAsync(Guid bookId, Guid userId, DateTimeOffset? asOf = null);
    Task<BookDto> GetCurrentBookAsync(Guid userId);
    Task<BookDto> SetCurrentBookAsync(Guid bookId, Guid userId);
    Task<CloseBookResponse> CloseBookAsync(Guid bookId, CloseBookRequest request, Guid userId);
    Task<ReopenBookResponse> ReopenBookAsync(Guid bookId, Guid userId);
    Task<CreateShareResponse> AddShareAsync(Guid bookId, AddShareRequest request, Guid userId);
    Task UpdateShareAsync(Guid bookId, Guid targetUserId, UpdateShareRequest request, Guid userId);
    Task RemoveShareAsync(Guid bookId, Guid targetUserId, Guid userId);
    Task<CreateShareResponse> AddGlobalShareAsync(AddShareRequest request, Guid userId);
    Task<RemoveShareResponse> RemoveGlobalShareAsync(Guid targetUserId, Guid userId);
}
