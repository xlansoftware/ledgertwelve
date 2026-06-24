using ledger12.Domain.Entities;

namespace ledger12.Tests.Unit.Domain;

public class TransactionTests
{
    private readonly Guid _bookId = Guid.NewGuid();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly DateTimeOffset _dateTime = new(2025, 6, 1, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Constructor_SetsProperties_WhenValidArguments()
    {
        var tx = new Transaction(_bookId, _userId, _dateTime, 100m);

        Assert.NotEqual(Guid.Empty, tx.Id);
        Assert.Equal(_bookId, tx.BookId);
        Assert.Equal(_userId, tx.UserId);
        Assert.Equal(_dateTime, tx.DateTime);
        Assert.Equal(100m, tx.Amount);
        Assert.Null(tx.OriginalCurrency);
        Assert.Null(tx.OriginalAmount);
        Assert.Null(tx.ExchangeRate);
        Assert.Null(tx.CategoryName);
        Assert.Null(tx.Note);
        Assert.False(tx.IsBookClosingEntry);
        Assert.Null(tx.ClosedBookId);
    }

    [Fact]
    public void Constructor_SetsOptionalFields_WhenProvided()
    {
        var tx = new Transaction(
            _bookId, _userId, _dateTime, -50m,
            originalCurrency: "USD",
            originalAmount: -75m,
            exchangeRate: 1.5m,
            categoryName: "Groceries",
            note: "Weekly shopping",
            isBookClosingEntry: true,
            closedBookId: Guid.NewGuid()
        );

        Assert.Equal("USD", tx.OriginalCurrency);
        Assert.Equal(-75m, tx.OriginalAmount);
        Assert.Equal(1.5m, tx.ExchangeRate);
        Assert.Equal("Groceries", tx.CategoryName);
        Assert.Equal("Weekly shopping", tx.Note);
        Assert.True(tx.IsBookClosingEntry);
        Assert.NotNull(tx.ClosedBookId);
    }

    [Fact]
    public void Constructor_CreatesNegativeAmount_WhenExpense()
    {
        var tx = new Transaction(_bookId, _userId, _dateTime, -200m);

        Assert.Equal(-200m, tx.Amount);
    }

    [Fact]
    public void Constructor_CreatesPositiveAmount_WhenIncome()
    {
        var tx = new Transaction(_bookId, _userId, _dateTime, 350m);

        Assert.Equal(350m, tx.Amount);
    }

    [Fact]
    public void Update_ChangesAllFields()
    {
        var tx = new Transaction(_bookId, _userId, _dateTime, 100m, categoryName: "OldCat", note: "Old note");

        var newDateTime = new DateTimeOffset(2025, 7, 1, 0, 0, 0, TimeSpan.Zero);
        tx.Update(newDateTime, 200m, "GBP", 300m, 1.5m, "NewCat", "New note");

        Assert.Equal(newDateTime, tx.DateTime);
        Assert.Equal(200m, tx.Amount);
        Assert.Equal("GBP", tx.OriginalCurrency);
        Assert.Equal(300m, tx.OriginalAmount);
        Assert.Equal(1.5m, tx.ExchangeRate);
        Assert.Equal("NewCat", tx.CategoryName);
        Assert.Equal("New note", tx.Note);
    }

    [Fact]
    public void Update_ClearsOptionalFields_WhenNullProvided()
    {
        var tx = new Transaction(
            _bookId, _userId, _dateTime, 100m,
            originalCurrency: "USD", originalAmount: 150m, exchangeRate: 1.5m,
            categoryName: "OldCat", note: "Old note"
        );

        tx.Update(_dateTime, 100m, null, null, null, null, null);

        Assert.Null(tx.OriginalCurrency);
        Assert.Null(tx.OriginalAmount);
        Assert.Null(tx.ExchangeRate);
        Assert.Null(tx.CategoryName);
        Assert.Null(tx.Note);
    }
}
