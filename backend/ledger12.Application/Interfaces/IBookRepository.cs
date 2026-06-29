using ledger12.Domain.Entities;

namespace ledger12.Application.Interfaces;

public interface IBookRepository
{
    Task<Book?> GetByIdAsync(Guid id);
    Task<List<Book>> GetByOwnerAsync(Guid ownerId);
    Task<List<Book>> GetVisibleBooksAsync(Guid userId);
    Task<Book?> GetVisibleBookAsync(Guid bookId, Guid userId);
    Task<bool> IsVisibleAsync(Guid bookId, Guid userId);
    Task<bool> HasEditAccessAsync(Guid bookId, Guid userId);
    Task<Book?> GetMainBookAsync(Guid userId);
    Task AddAsync(Book book);
    Task UpdateAsync(Book book);
    Task DeleteAsync(Book book);
    Task DeleteAllByOwnerAsync(Guid ownerId);
    Task<bool> HasTransactionsAsync(Guid bookId);
    Task<int> GetTransactionCountAsync(Guid bookId, DateTimeOffset? asOf = null);
    Task<decimal> GetTotalSumAsync(Guid bookId, DateTimeOffset? asOf = null);
    Task<List<BookShare>> GetSharesAsync(Guid bookId);
    Task AddShareAsync(BookShare share);
    Task UpdateShareAsync(BookShare share);
    Task DeleteShareAsync(BookShare share);
    Task<BookShare?> GetShareAsync(Guid bookId, Guid userId);
    Task<List<GlobalShare>> GetGlobalSharesAsync(Guid ownerId);
    Task<GlobalShare?> GetGlobalShareAsync(Guid ownerId, Guid sharedWithUserId);
    Task AddGlobalShareAsync(GlobalShare share);
    Task DeleteGlobalShareAsync(GlobalShare share);
    Task<UserPreference?> GetUserPreferenceAsync(Guid userId);
    Task SetUserPreferenceAsync(UserPreference pref);
    Task<List<Guid>> GetUserIdsWithAccessAsync(Guid userId);
}
