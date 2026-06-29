using ledger12.Domain.Entities;

namespace ledger12.Application.Interfaces;

public interface ICategoryRepository
{
    Task<Category?> GetByIdAsync(Guid id);
    Task<List<Category>> GetByUserAsync(Guid userId);
    Task<Category?> GetByNameAsync(Guid userId, string name);
    Task AddAsync(Category category);
    Task UpdateAsync(Category category);
    Task DeleteAsync(Category category);
    Task DeleteAllByUserAsync(Guid userId);
    Task<int> ReassignTransactionsAsync(string fromCategoryName, string toCategoryName, Guid userId);
    Task<int> GetTransactionCountForCategoryAsync(string categoryName);
    Task<int> GetMaxOrderAsync(Guid userId);
}
