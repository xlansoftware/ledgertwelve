namespace ledger12.Domain;

public class WeeklyAggregate : AggregateBase
{
    private WeeklyAggregate() { } // EF Core

    public WeeklyAggregate(
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