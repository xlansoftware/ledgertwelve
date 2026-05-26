namespace ledger12.Domain;

public interface IAggregateEntity
{
    DateOnly PeriodStart { get; }
    string Book { get; }
    string Author { get; }
    string Category { get; }
    string Currency { get; }
    decimal SumValue { get; }
    int TransactionCount { get; }
}
