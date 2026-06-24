namespace ledger12.Domain.Entities;

public class Transaction
{
    public Guid Id { get; private set; }
    public Guid BookId { get; private set; }
    public Guid UserId { get; private set; }
    public DateTimeOffset DateTime { get; private set; }
    public decimal Amount { get; private set; }
    public string? OriginalCurrency { get; private set; }
    public decimal? OriginalAmount { get; private set; }
    public decimal? ExchangeRate { get; private set; }
    public string? CategoryName { get; private set; }
    public string? Note { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public bool IsBookClosingEntry { get; private set; }
    public Guid? ClosedBookId { get; private set; }

    public Book? Book { get; private set; }

    private Transaction() { }

    public Transaction(
        Guid bookId,
        Guid userId,
        DateTimeOffset dateTime,
        decimal amount,
        string? originalCurrency = null,
        decimal? originalAmount = null,
        decimal? exchangeRate = null,
        string? categoryName = null,
        string? note = null,
        bool isBookClosingEntry = false,
        Guid? closedBookId = null)
    {
        Id = Guid.NewGuid();
        BookId = bookId;
        UserId = userId;
        DateTime = dateTime;
        Amount = amount;
        OriginalCurrency = originalCurrency;
        OriginalAmount = originalAmount;
        ExchangeRate = exchangeRate;
        CategoryName = categoryName;
        Note = note;
        CreatedAt = DateTimeOffset.UtcNow;
        IsBookClosingEntry = isBookClosingEntry;
        ClosedBookId = closedBookId;
    }

    public void Update(
        DateTimeOffset dateTime,
        decimal amount,
        string? originalCurrency = null,
        decimal? originalAmount = null,
        decimal? exchangeRate = null,
        string? categoryName = null,
        string? note = null)
    {
        DateTime = dateTime;
        Amount = amount;
        OriginalCurrency = originalCurrency;
        OriginalAmount = originalAmount;
        ExchangeRate = exchangeRate;
        CategoryName = categoryName;
        Note = note;
    }
}
