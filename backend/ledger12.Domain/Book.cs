namespace ledger12.Domain;

public class Book
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = null!;
    public string Currency { get; private set; } = null!;
    public string? Color { get; private set; }
    public string? Status { get; private set; }

    private Book() { } // EF Core

    public Book(string name, string currency, string? color = null, string? status = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        Id = Guid.NewGuid();
        Name = name.Trim();
        Currency = currency.Trim();
        Color = color;
        Status = status;
    }

    public void Update(string name, string currency, string? color, string? status)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        Name = name.Trim();
        Currency = currency.Trim();
        Color = color;
        Status = status;
    }
}
