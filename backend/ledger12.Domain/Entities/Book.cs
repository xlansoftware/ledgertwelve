using ledger12.Domain.Enums;

namespace ledger12.Domain.Entities;

public class Book
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = null!;
    public string? Currency { get; private set; }
    public BookStatus Status { get; private set; }
    public Guid OwnerId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? ClosedAt { get; private set; }

    public ICollection<BookShare> Shares { get; private set; } = new List<BookShare>();

    private Book() { }

    public Book(string name, Guid ownerId, string? currency = null)
    {
        Id = Guid.NewGuid();
        Name = name;
        Currency = currency;
        Status = BookStatus.Open;
        OwnerId = ownerId;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    /// <summary>
    /// Restores a book from backup data, preserving its original identity and state.
    /// </summary>
    public static Book Restore(Guid id, string name, Guid ownerId, string? currency, BookStatus status, DateTimeOffset? closedAt = null)
    {
        var book = new Book
        {
            Id = id,
            Name = name,
            Currency = currency,
            Status = status,
            OwnerId = ownerId,
            CreatedAt = DateTimeOffset.UtcNow,
            ClosedAt = closedAt
        };
        return book;
    }

    public void Update(string name, string? currency)
    {
        Name = name;
        Currency = currency;
    }

    public void Close(DateTimeOffset closedAt)
    {
        Status = BookStatus.Closed;
        ClosedAt = closedAt;
    }

    public void Reopen()
    {
        Status = BookStatus.Open;
        ClosedAt = null;
    }
}
