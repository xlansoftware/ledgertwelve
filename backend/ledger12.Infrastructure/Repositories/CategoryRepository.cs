using Microsoft.EntityFrameworkCore;
using ledger12.Application.Interfaces;
using ledger12.Domain.Entities;
using ledger12.Infrastructure.Data;

namespace ledger12.Infrastructure.Repositories;

public class CategoryRepository : ICategoryRepository
{
    private readonly AppDbContext _context;

    public CategoryRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Category?> GetByIdAsync(Guid id)
    {
        return await _context.Categories.FindAsync(id);
    }

    public async Task<List<Category>> GetByUserAsync(Guid userId)
    {
        return await _context.Categories
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.Order)
            .ToListAsync();
    }

    public async Task<Category?> GetByNameAsync(Guid userId, string name)
    {
        return await _context.Categories
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Name == name);
    }

    public async Task AddAsync(Category category)
    {
        await _context.Categories.AddAsync(category);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Category category)
    {
        _context.Categories.Update(category);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Category category)
    {
        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
    }

    public async Task<int> ReassignTransactionsAsync(string fromCategoryName, string toCategoryName, Guid userId)
    {
        var transactions = await _context.Transactions
            .Where(t => t.CategoryName == fromCategoryName &&
                        _context.Books.Any(b => b.Id == t.BookId && (b.OwnerId == userId || b.Shares.Any(s => s.UserId == userId))))
            .ToListAsync();

        foreach (var tx in transactions)
        {
            tx.Update(
                tx.DateTime,
                tx.Amount,
                tx.OriginalCurrency,
                tx.OriginalAmount,
                tx.ExchangeRate,
                toCategoryName,
                tx.Note
            );
        }

        await _context.SaveChangesAsync();
        return transactions.Count;
    }

    public async Task<int> GetTransactionCountForCategoryAsync(string categoryName)
    {
        return await _context.Transactions.CountAsync(t => t.CategoryName == categoryName);
    }

    public async Task<int> GetMaxOrderAsync(Guid userId)
    {
        var max = await _context.Categories
            .Where(c => c.UserId == userId)
            .MaxAsync(c => (int?)c.Order) ?? 0;
        return max;
    }
}
