namespace ledger12.Domain;

public abstract class AggregateBase : IAggregateEntity
{
    public DateOnly PeriodStart { get; private set; }
    public string Book { get; private set; } = null!;
    public string Author { get; private set; } = null!;
    public string Category { get; private set; } = null!;
    public decimal SumValue { get; private set; }
    public int TransactionCount { get; private set; }

    // EF Core
    protected AggregateBase() { }

    protected AggregateBase(
        DateOnly periodStart,
        string book,
        string author,
        string category,
        decimal value,
        int transactionCount = 1)
    {
        PeriodStart = periodStart;
        Book = book;
        Author = author;
        Category = category;
        SumValue = value;
        TransactionCount = transactionCount;
    }

    public void ApplyTransaction(decimal value)
    {
        SumValue += value;
        TransactionCount++;
    }
}