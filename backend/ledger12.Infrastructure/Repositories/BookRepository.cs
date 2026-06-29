using Microsoft.EntityFrameworkCore;
using ledger12.Application.Interfaces;
using ledger12.Domain.Entities;
using ledger12.Domain.Enums;
using ledger12.Infrastructure.Data;

namespace ledger12.Infrastructure.Repositories;

public class BookRepository : IBookRepository
{
    private readonly AppDbContext _context;

    public BookRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Book?> GetByIdAsync(Guid id)
    {
        return await _context.Books
            .Include(b => b.Shares)
            .FirstOrDefaultAsync(b => b.Id == id);
    }

    public async Task<List<Book>> GetByOwnerAsync(Guid ownerId)
    {
        return await _context.Books
            .Where(b => b.OwnerId == ownerId)
            .Include(b => b.Shares)
            .ToListAsync();
    }

    public async Task<List<Book>> GetVisibleBooksAsync(Guid userId)
    {
        return await _context.Books
            .Where(b => b.OwnerId == userId ||
                        b.Shares.Any(s => s.UserId == userId))
            .Include(b => b.Shares)
            .ToListAsync();
    }

    public async Task<Book?> GetVisibleBookAsync(Guid bookId, Guid userId)
    {
        return await _context.Books
            .Where(b => b.Id == bookId &&
                        (b.OwnerId == userId || b.Shares.Any(s => s.UserId == userId)))
            .Include(b => b.Shares)
            .FirstOrDefaultAsync();
    }

    public async Task<bool> IsVisibleAsync(Guid bookId, Guid userId)
    {
        return await _context.Books
            .AnyAsync(b => b.Id == bookId &&
                           (b.OwnerId == userId || b.Shares.Any(s => s.UserId == userId)));
    }

    public async Task<bool> HasEditAccessAsync(Guid bookId, Guid userId)
    {
        return await _context.Books
            .AnyAsync(b => b.Id == bookId &&
                           (b.OwnerId == userId ||
                            b.Shares.Any(s => s.UserId == userId && s.Permission == BookPermission.Edit)));
    }

    public async Task<Book?> GetMainBookAsync(Guid userId)
    {
        // Look for a "Main" book visible to the user — either owned or shared
        var mainBook = await _context.Books
            .Include(b => b.Shares)
            .FirstOrDefaultAsync(b => b.Name == "Main" &&
                (b.OwnerId == userId || b.Shares.Any(s => s.UserId == userId)));

        if (mainBook is not null)
            return mainBook;

        // Fallback: user's own first open book
        return await _context.Books
            .Include(b => b.Shares)
            .Where(b => b.OwnerId == userId && b.Status == BookStatus.Open)
            .OrderBy(b => b.CreatedAt)
            .FirstOrDefaultAsync();
    }

    public async Task AddAsync(Book book)
    {
        await _context.Books.AddAsync(book);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Book book)
    {
        _context.Books.Update(book);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Book book)
    {
        _context.Books.Remove(book);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> HasTransactionsAsync(Guid bookId)
    {
        return await _context.Transactions.AnyAsync(t => t.BookId == bookId);
    }

    public async Task<int> GetTransactionCountAsync(Guid bookId, DateTimeOffset? asOf = null)
    {
        var query = _context.Transactions.Where(t => t.BookId == bookId && !t.IsBookClosingEntry);
        if (asOf.HasValue)
        {
            var upperBound = asOf.Value.Date.AddDays(1);
            query = query.Where(t => t.DateTime < upperBound);
        }
        return await query.CountAsync();
    }

    public async Task<decimal> GetTotalSumAsync(Guid bookId, DateTimeOffset? asOf = null)
    {
        var query = _context.Transactions.Where(t => t.BookId == bookId && !t.IsBookClosingEntry);
        if (asOf.HasValue)
        {
            var upperBound = asOf.Value.Date.AddDays(1);
            query = query.Where(t => t.DateTime < upperBound);
        }
        var sum = await query.SumAsync(t => (decimal?)t.Amount) ?? 0;
        return sum;
    }

    public async Task<List<BookShare>> GetSharesAsync(Guid bookId)
    {
        return await _context.BookShares.Where(s => s.BookId == bookId).ToListAsync();
    }

    public async Task AddShareAsync(BookShare share)
    {
        await _context.BookShares.AddAsync(share);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateShareAsync(BookShare share)
    {
        _context.BookShares.Update(share);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteShareAsync(BookShare share)
    {
        _context.BookShares.Remove(share);
        await _context.SaveChangesAsync();
    }

    public async Task<BookShare?> GetShareAsync(Guid bookId, Guid userId)
    {
        return await _context.BookShares.FindAsync(bookId, userId);
    }

    public async Task<List<GlobalShare>> GetGlobalSharesAsync(Guid ownerId)
    {
        return await _context.GlobalShares.Where(s => s.OwnerId == ownerId).ToListAsync();
    }

    public async Task<GlobalShare?> GetGlobalShareAsync(Guid ownerId, Guid sharedWithUserId)
    {
        return await _context.GlobalShares.FindAsync(ownerId, sharedWithUserId);
    }

    public async Task AddGlobalShareAsync(GlobalShare share)
    {
        await _context.GlobalShares.AddAsync(share);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteGlobalShareAsync(GlobalShare share)
    {
        _context.GlobalShares.Remove(share);
        await _context.SaveChangesAsync();
    }

    public async Task<UserPreference?> GetUserPreferenceAsync(Guid userId)
    {
        return await _context.UserPreferences.FindAsync(userId);
    }

    public async Task SetUserPreferenceAsync(UserPreference pref)
    {
        var existing = await _context.UserPreferences.FindAsync(pref.UserId);
        if (existing != null)
        {
            existing.SetCurrentBook(pref.CurrentBookId);
            _context.UserPreferences.Update(existing);
        }
        else
        {
            await _context.UserPreferences.AddAsync(pref);
        }
        await _context.SaveChangesAsync();
    }

    public async Task<List<Guid>> GetUserIdsWithAccessAsync(Guid userId)
    {
        var bookIds = await _context.Books
            .Where(b => b.OwnerId == userId)
            .Select(b => b.Id)
            .ToListAsync();

        var sharedUserIds = await _context.BookShares
            .Where(s => bookIds.Contains(s.BookId))
            .Select(s => s.UserId)
            .Distinct()
            .ToListAsync();

        var ownerIds = await _context.BookShares
            .Where(s => s.UserId == userId)
            .Select(s => s.BookId)
            .Join(_context.Books,
                  bookId => bookId,
                  book => book.Id,
                  (bookId, book) => book.OwnerId)
            .Distinct()
            .ToListAsync();

        return sharedUserIds.Union(ownerIds).Distinct().ToList();
    }
}
