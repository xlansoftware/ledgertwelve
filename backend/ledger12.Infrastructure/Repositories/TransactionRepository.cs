using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Domain;
using ledger12.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ledger12.Infrastructure.Repositories;

public class TransactionRepository : ITransactionRepository
{
    private readonly AppDbContext _context;

    public TransactionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<T>> GetAggregatesAsync<T>(Granularity granularity, AggregateFilter filter)
        where T : class, IAggregateEntity
    {
        var query = _context.Set<T>().AsQueryable();

        query = query.Where(a => a.PeriodStart >= filter.From && a.PeriodStart <= filter.To);

        if (filter.Book is not null)
            query = query.Where(a => a.Book == filter.Book);

        if (filter.Author is not null)
            query = query.Where(a => a.Author == filter.Author);

        if (filter.Category is not null)
            query = query.Where(a => a.Category == filter.Category);

        query = query.OrderBy(a => a.PeriodStart);

        var totalCount = await query.CountAsync();

        var items = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        return new PagedResult<T>(items, totalCount, filter.Page, filter.PageSize);
    }

    public async Task<Transaction?> GetByIdAsync(Guid id)
    {
        return await _context.Transactions.FindAsync(id);
    }

    public async Task<PagedResult<Transaction>> GetAllAsync(
        int page = 1,
        int pageSize = 20,
        string? book = null,
        string? author = null,
        string? category = null,
        string? currency = null)
    {
        var query = _context.Transactions.AsQueryable();

        if (book is not null)
            query = query.Where(t => t.Book == book);

        if (author is not null)
            query = query.Where(t => t.Author == author);

        if (category is not null)
            query = query.Where(t => t.Category == category);

        query = query.OrderByDescending(t => t.Date);

        var totalCount = await query.CountAsync();

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<Transaction>(items, totalCount, page, pageSize);
    }

    public async Task<Transaction> UpdateAsync(Transaction transaction)
    {
        _context.Transactions.Update(transaction);
        await _context.SaveChangesAsync();
        return transaction;
    }

    public async Task DeleteAsync(Transaction transaction)
    {
        _context.Transactions.Remove(transaction);
        await _context.SaveChangesAsync();
    }

    public async Task<Transaction> AddAsync(Transaction transaction)
    {
        _context.Transactions.Add(transaction);

        var book = transaction.Book ?? string.Empty;
        var date = transaction.Date;

        await UpsertAggregateAsync<DailyAggregate>(
            _context.DailyAggregates, PeriodHelper.GetPeriodStart(date, Granularity.Daily),
            book, transaction.Author, transaction.Category, transaction.Value);

        await UpsertAggregateAsync<WeeklyAggregate>(
            _context.WeeklyAggregates, PeriodHelper.GetPeriodStart(date, Granularity.Weekly),
            book, transaction.Author, transaction.Category, transaction.Value);

        await UpsertAggregateAsync<MonthlyAggregate>(
            _context.MonthlyAggregates, PeriodHelper.GetPeriodStart(date, Granularity.Monthly),
            book, transaction.Author, transaction.Category, transaction.Value);

        await UpsertAggregateAsync<YearlyAggregate>(
            _context.YearlyAggregates, PeriodHelper.GetPeriodStart(date, Granularity.Yearly),
            book, transaction.Author, transaction.Category, transaction.Value);

        await _context.SaveChangesAsync();
        return transaction;
    }

    public async Task RebuildAggregatesAsync()
    {
        // Remove all existing aggregates
        _context.DailyAggregates.RemoveRange(await _context.DailyAggregates.ToListAsync());
        _context.WeeklyAggregates.RemoveRange(await _context.WeeklyAggregates.ToListAsync());
        _context.MonthlyAggregates.RemoveRange(await _context.MonthlyAggregates.ToListAsync());
        _context.YearlyAggregates.RemoveRange(await _context.YearlyAggregates.ToListAsync());

        var transactions = await _context.Transactions.AsNoTracking().ToListAsync();

        _context.DailyAggregates.AddRange(BuildAggregates<DailyAggregate>(transactions, Granularity.Daily));
        _context.WeeklyAggregates.AddRange(BuildAggregates<WeeklyAggregate>(transactions, Granularity.Weekly));
        _context.MonthlyAggregates.AddRange(BuildAggregates<MonthlyAggregate>(transactions, Granularity.Monthly));
        _context.YearlyAggregates.AddRange(BuildAggregates<YearlyAggregate>(transactions, Granularity.Yearly));

        await _context.SaveChangesAsync();
    }

    private static List<T> BuildAggregates<T>(List<Transaction> transactions, Granularity granularity)
        where T : class, IAggregateEntity
    {
        return transactions
            .GroupBy(t => new
            {
                PeriodStart = PeriodHelper.GetPeriodStart(t.Date, granularity),
                Book = t.Book ?? string.Empty,
                t.Author,
                t.Category,
            })
            .Select(g => Activator.CreateInstance(
                typeof(T),
                g.Key.PeriodStart,
                g.Key.Book,
                g.Key.Author,
                g.Key.Category,
                g.Sum(t => t.Value),
                g.Count()) as T
            ?? throw new InvalidOperationException($"Failed to create instance of {typeof(T).Name}"))
            .ToList();
    }

    private static async Task UpsertAggregateAsync<T>(
        DbSet<T> dbSet,
        DateOnly periodStart,
        string book,
        string author,
        string category,
        decimal value)
        where T : class, IAggregateEntity
    {
        var existing = await dbSet.FindAsync(periodStart, book, author, category);

        if (existing is not null)
        {
            existing.ApplyTransaction(value);
        }
        else
        {
            var aggregate = Activator.CreateInstance(
                typeof(T),
                periodStart,
                book,
                author,
                category,
                value,
                1) as T;
            dbSet.Add(aggregate!);
        }
    }
}