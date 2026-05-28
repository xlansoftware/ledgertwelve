using Microsoft.EntityFrameworkCore;
using ledger12.Application.Interfaces;
using ledger12.Domain;
using ledger12.Infrastructure.Data;

namespace ledger12.Infrastructure.Repositories;

public class BookRepository : IBookRepository
{
    private readonly AppDbContext _context;

    public BookRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Book>> GetAllAsync()
    {
        return await _context.Books
            .OrderBy(b => b.Name)
            .ToListAsync();
    }

    public async Task<Book?> GetByIdAsync(Guid id)
    {
        return await _context.Books.FindAsync(id);
    }

    public async Task<Book> AddAsync(Book book)
    {
        if (await ExistsByNameAsync(book.Name))
            throw new InvalidOperationException($"A book with the name '{book.Name}' already exists.");

        _context.Books.Add(book);
        await _context.SaveChangesAsync();
        return book;
    }

    public async Task<Book> UpdateAsync(Book book)
    {
        _context.Books.Update(book);
        await _context.SaveChangesAsync();
        return book;
    }

    public async Task DeleteAsync(Book book)
    {
        _context.Books.Remove(book);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> ExistsByNameAsync(string name, Guid? excludeId = null)
    {
        var query = _context.Books.Where(b => b.Name == name.Trim());

        if (excludeId.HasValue)
            query = query.Where(b => b.Id != excludeId.Value);

        return await query.AnyAsync();
    }
}
