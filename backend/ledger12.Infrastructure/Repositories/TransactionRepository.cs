using Microsoft.EntityFrameworkCore;
using ledger12.Application.Interfaces;
using ledger12.Domain.Entities;
using ledger12.Infrastructure.Data;

namespace ledger12.Infrastructure.Repositories;

public class TransactionRepository : ITransactionRepository
{
    private readonly AppDbContext _context;

    public TransactionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Transaction?> GetByIdAsync(Guid id)
    {
        return await _context.Transactions.FindAsync(id);
    }

    public async Task<List<Transaction>> SearchAsync(
        Guid? bookId = null,
        DateTimeOffset? from = null,
        DateTimeOffset? to = null,
        List<string>? categories = null,
        List<Guid>? createdBy = null,
        string? noteSearch = null,
        decimal? minValue = null,
        decimal? maxValue = null,
        int page = 1,
        int pageSize = 50)
    {
        var query = _context.Transactions.AsQueryable();

        if (bookId.HasValue)
            query = query.Where(t => t.BookId == bookId.Value);
        if (from.HasValue)
            query = query.Where(t => t.DateTime >= from.Value);
        if (to.HasValue)
            query = query.Where(t => t.DateTime < to.Value);
        if (categories != null && categories.Count > 0)
            query = query.Where(t => categories.Contains(t.CategoryName ?? ""));
        if (createdBy != null && createdBy.Count > 0)
            query = query.Where(t => createdBy.Contains(t.UserId));
        if (!string.IsNullOrWhiteSpace(noteSearch))
            query = query.Where(t => t.Note != null && EF.Functions.Like(t.Note, $"%{noteSearch}%"));
        if (minValue.HasValue)
            query = query.Where(t => t.Amount >= minValue.Value);
        if (maxValue.HasValue)
            query = query.Where(t => t.Amount <= maxValue.Value);

        return await query
            .OrderByDescending(t => t.DateTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<int> GetSearchCountAsync(
        Guid? bookId = null,
        DateTimeOffset? from = null,
        DateTimeOffset? to = null,
        List<string>? categories = null,
        List<Guid>? createdBy = null,
        string? noteSearch = null,
        decimal? minValue = null,
        decimal? maxValue = null)
    {
        var query = _context.Transactions.AsQueryable();

        if (bookId.HasValue)
            query = query.Where(t => t.BookId == bookId.Value);
        if (from.HasValue)
            query = query.Where(t => t.DateTime >= from.Value);
        if (to.HasValue)
            query = query.Where(t => t.DateTime < to.Value);
        if (categories != null && categories.Count > 0)
            query = query.Where(t => categories.Contains(t.CategoryName ?? ""));
        if (createdBy != null && createdBy.Count > 0)
            query = query.Where(t => createdBy.Contains(t.UserId));
        if (!string.IsNullOrWhiteSpace(noteSearch))
            query = query.Where(t => t.Note != null && EF.Functions.Like(t.Note, $"%{noteSearch}%"));
        if (minValue.HasValue)
            query = query.Where(t => t.Amount >= minValue.Value);
        if (maxValue.HasValue)
            query = query.Where(t => t.Amount <= maxValue.Value);

        return await query.CountAsync();
    }

    public async Task AddAsync(Transaction transaction)
    {
        await _context.Transactions.AddAsync(transaction);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAllByBookIdsAsync(List<Guid> bookIds)
    {
        var transactions = await _context.Transactions
            .Where(t => bookIds.Contains(t.BookId))
            .ToListAsync();
        _context.Transactions.RemoveRange(transactions);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Transaction transaction)
    {
        _context.Transactions.Update(transaction);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Transaction transaction)
    {
        _context.Transactions.Remove(transaction);
        await _context.SaveChangesAsync();
    }

    public async Task<int> GetTransactionCountForCategoryAsync(string categoryName, Guid userId)
    {
        return await _context.Transactions
            .CountAsync(t => t.CategoryName == categoryName &&
                _context.Books.Any(b => b.Id == t.BookId && (b.OwnerId == userId || b.Shares.Any(s => s.UserId == userId))));
    }

    public async Task UpdateCategoryNameAsync(string oldName, string newName, Guid userId)
    {
        var transactions = await _context.Transactions
            .Where(t => t.CategoryName == oldName &&
                _context.Books.Any(b => b.Id == t.BookId && (b.OwnerId == userId || b.Shares.Any(s => s.UserId == userId))))
            .ToListAsync();

        foreach (var tx in transactions)
        {
            tx.Update(tx.DateTime, tx.Amount, tx.OriginalCurrency, tx.OriginalAmount, tx.ExchangeRate, newName, tx.Note);
        }

        await _context.SaveChangesAsync();
    }

    public async Task<List<(string Period, decimal Income, decimal Expense)>> GetTotalsReportAsync(
        Guid bookId, string? period, DateTimeOffset? from, DateTimeOffset? to)
    {
        var query = _context.Transactions
            .Where(t => t.BookId == bookId);

        if (from.HasValue) query = query.Where(t => t.DateTime >= from.Value);
        if (to.HasValue) query = query.Where(t => t.DateTime < to.Value);

        var transactions = await query.ToListAsync();

        var grouping = period?.ToLowerInvariant() switch
        {
            "day" => transactions.GroupBy(t => t.DateTime.ToString("yyyy-MM-dd")),
            "week" => transactions.GroupBy(t => GetWeekStart(t.DateTime).ToString("yyyy-MM-dd")),
            "year" => transactions.GroupBy(t => t.DateTime.ToString("yyyy")),
            _ => transactions.GroupBy(t => t.DateTime.ToString("yyyy-MM")), // month default
        };

        return grouping.Select(g => (
            g.Key,
            g.Where(t => t.Amount > 0).Sum(t => t.Amount),
            g.Where(t => t.Amount < 0).Sum(t => t.Amount)
        )).OrderBy(r => r.Item1).ToList();
    }

    public async Task<List<(string CategoryName, decimal Amount)>> GetCategoryReportAsync(
        Guid bookId, DateTimeOffset? from, DateTimeOffset? to)
    {
        var query = _context.Transactions
            .Where(t => t.BookId == bookId);

        if (from.HasValue) query = query.Where(t => t.DateTime >= from.Value);
        if (to.HasValue) query = query.Where(t => t.DateTime < to.Value);

        var result = await query
            .GroupBy(t => t.CategoryName ?? "Unknown")
            .Select(g => new { CategoryName = g.Key, Amount = g.Sum(t => t.Amount) })
            .ToListAsync();

        return result.Select(r => (r.CategoryName, r.Amount)).OrderByDescending(r => Math.Abs(r.Amount)).ToList();
    }

    public async Task<List<(DateTimeOffset Date, decimal Amount)>> GetDailyReportAsync(
        Guid bookId, DateTimeOffset from, DateTimeOffset to)
    {
        var transactions = await _context.Transactions
            .Where(t => t.BookId == bookId &&
                        t.DateTime >= from && t.DateTime < to)
            .ToListAsync();

        return transactions
            .GroupBy(t => t.DateTime.Date)
            .Select(g => (g.Key, g.Sum(t => t.Amount)))
            .OrderBy(r => r.Key)
            .Select(r => (new DateTimeOffset(r.Key, TimeSpan.Zero), r.Item2))
            .ToList();
    }

    public async Task<List<(string Period, decimal Amount)>> GetMonthlyReportAsync(
        Guid bookId, DateTimeOffset from, DateTimeOffset to)
    {
        var transactions = await _context.Transactions
            .Where(t => t.BookId == bookId &&
                        t.DateTime >= from && t.DateTime < to)
            .ToListAsync();

        return transactions
            .GroupBy(t => t.DateTime.ToString("yyyy-MM"))
            .Select(g => (g.Key, g.Sum(t => t.Amount)))
            .OrderBy(r => r.Item1)
            .ToList();
    }

    private static DateTimeOffset GetWeekStart(DateTimeOffset dt)
    {
        var diff = (7 + (dt.DayOfWeek - DayOfWeek.Monday)) % 7;
        return dt.AddDays(-diff).Date;
    }
}
