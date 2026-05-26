namespace ledger12.Domain;

public class DailyAggregate : IAggregateEntity
{
    public DateOnly PeriodStart { get; private set; }
    public string Book { get; private set; } = null!;
    public string Author { get; private set; } = null!;
    public string Category { get; private set; } = null!;
    public string Currency { get; private set; } = null!;
    public decimal SumValue { get; private set; }
    public int TransactionCount { get; private set; }

    private DailyAggregate() { } // EF Core

    public DailyAggregate(
        DateOnly periodStart,
        string book,
        string author,
        string category,
        string currency,
        decimal value)
    {
        PeriodStart = periodStart;
        Book = book;
        Author = author;
        Category = category;
        Currency = currency;
        SumValue = value;
        TransactionCount = 1;
    }

    public void ApplyTransaction(decimal value)
    {
        SumValue += value;
        TransactionCount++;
    }
}
