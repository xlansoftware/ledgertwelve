namespace ledger12.Domain;

public class DailyAggregate : AggregateBase
{
    private DailyAggregate() { } // EF Core

    public DailyAggregate(
        DateOnly periodStart,
        string book,
        string author,
        string category,
        decimal value,
        int transactionCount = 1)
        : base(periodStart, book, author, category, value, transactionCount)
    {
    }
}