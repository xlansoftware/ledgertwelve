namespace ledger12.Domain;

public class YearlyAggregate : AggregateBase
{
    private YearlyAggregate() { } // EF Core

    public YearlyAggregate(
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