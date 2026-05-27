namespace ledger12.Domain;

public class MonthlyAggregate : AggregateBase
{
    private MonthlyAggregate() { } // EF Core

    public MonthlyAggregate(
        DateOnly periodStart,
        string book,
        string author,
        string category,
        string currency,
        decimal value,
        int transactionCount = 1)
        : base(periodStart, book, author, category, currency, value, transactionCount)
    {
    }
}