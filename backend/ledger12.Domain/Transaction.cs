namespace ledger12.Domain;

public class Transaction
{
    public Guid Id { get; private set; }
    public decimal Value { get; private set; }
    public string Currency { get; private set; } = null!;
    public string Category { get; private set; } = null!;
    public string? Book { get; private set; }
    public string Author { get; private set; } = null!;
    public DateTimeOffset Date { get; private set; }

    private Transaction() { } // EF Core

    public Transaction(
        decimal value,
        string currency,
        string category,
        string author,
        DateTimeOffset date,
        string? book = null)
    {
        if (value == 0) throw new ArgumentException("Transaction value cannot be zero.", nameof(value));
        ArgumentException.ThrowIfNullOrWhiteSpace(currency);
        ArgumentException.ThrowIfNullOrWhiteSpace(category);
        ArgumentException.ThrowIfNullOrWhiteSpace(author);

        Id = Guid.NewGuid();
        Value = value;
        Currency = currency;
        Category = category;
        Author = author;
        Book = book;
        Date = date;
    }
}
