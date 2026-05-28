using ledger12.Domain;

namespace ledger12.Application.Interfaces;

public interface IBookRepository
{
    Task<List<Book>> GetAllAsync();
    Task<Book?> GetByIdAsync(Guid id);
    Task<Book> AddAsync(Book book);
    Task<Book> UpdateAsync(Book book);
    Task DeleteAsync(Book book);
    Task<bool> ExistsByNameAsync(string name, Guid? excludeId = null);
}
