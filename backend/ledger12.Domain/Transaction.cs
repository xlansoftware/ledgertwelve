namespace ledger12.Domain;

public class Transaction
{
    public Guid Id { get; private set; }
    
     // The value is always stored in book currency. 
     // The UI handles if the currency differ and propose conversion
    public decimal Value { get; private set; }
    public string Category { get; private set; } = null!;
    public string? Book { get; private set; }
    public string? Notes { get; private set; }
    public string Author { get; private set; } = null!;
    public DateTimeOffset Date { get; private set; }

    private Transaction() { } // EF Core

    public Transaction(
        decimal value,
        string category,
        string author,
        DateTimeOffset date,
        string? book = null,
        string? notes = null)
    {
        if (value == 0) throw new ArgumentException("Transaction value cannot be zero.", nameof(value));
        ArgumentException.ThrowIfNullOrWhiteSpace(category);
        ArgumentException.ThrowIfNullOrWhiteSpace(author);

        Id = Guid.NewGuid();
        Value = value;
        Category = category;
        Author = author;
        Book = book;
        Notes = notes;
        Date = date;
    }

    public void Update(
        decimal value,
        string category,
        string author,
        DateTimeOffset date,
        string? book = null,
        string? notes = null)
    {
        if (value == 0) throw new ArgumentException("Transaction value cannot be zero.", nameof(value));
        ArgumentException.ThrowIfNullOrWhiteSpace(category);
        ArgumentException.ThrowIfNullOrWhiteSpace(author);

        Value = value;
        Category = category;
        Author = author;
        Book = book;
        Notes = notes;
        Date = date;
    }
}
