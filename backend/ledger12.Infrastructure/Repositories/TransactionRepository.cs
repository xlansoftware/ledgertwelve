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