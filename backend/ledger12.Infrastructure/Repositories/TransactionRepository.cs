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

        if (filter.Currency is not null)
            query = query.Where(a => a.Currency == filter.Currency);

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

        if (currency is not null)
            query = query.Where(t => t.Currency == currency);

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
            book, transaction.Author, transaction.Category, transaction.Currency, transaction.Value);

        await UpsertAggregateAsync<WeeklyAggregate>(
            _context.WeeklyAggregates, PeriodHelper.GetPeriodStart(date, Granularity.Weekly),
            book, transaction.Author, transaction.Category, transaction.Currency, transaction.Value);

        await UpsertAggregateAsync<MonthlyAggregate>(
            _context.MonthlyAggregates, PeriodHelper.GetPeriodStart(date, Granularity.Monthly),
            book, transaction.Author, transaction.Category, transaction.Currency, transaction.Value);

        await UpsertAggregateAsync<YearlyAggregate>(
            _context.YearlyAggregates, PeriodHelper.GetPeriodStart(date, Granularity.Yearly),
            book, transaction.Author, transaction.Category, transaction.Currency, transaction.Value);

        await _context.SaveChangesAsync();
        return transaction;
    }

    private static async Task UpsertAggregateAsync<T>(
        DbSet<T> dbSet,
        DateOnly periodStart,
        string book,
        string author,
        string category,
        string currency,
        decimal value)
        where T : class, IAggregateEntity
    {
        var existing = await dbSet.FindAsync(periodStart, book, author, category, currency);

        if (existing is not null)
        {
            var method = typeof(T).GetMethod("ApplyTransaction", new[] { typeof(decimal) });
            method!.Invoke(existing, [value]);
        }
        else
        {
            var aggregate = Activator.CreateInstance(
                typeof(T),
                periodStart,
                book,
                author,
                category,
                currency,
                value) as T;
            dbSet.Add(aggregate!);
        }
    }
}