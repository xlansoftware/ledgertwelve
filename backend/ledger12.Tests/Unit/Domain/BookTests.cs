using ledger12.Domain.Entities;
using ledger12.Domain.Enums;
using ledger12.Domain.Exceptions;

namespace ledger12.Tests.Unit.Domain;

public class BookTests
{
    [Fact]
    public void Constructor_SetsProperties_WhenValidArguments()
    {
        var ownerId = Guid.NewGuid();
        var book = new Book("Test Book", ownerId, "EUR");

        Assert.NotEqual(Guid.Empty, book.Id);
        Assert.Equal("Test Book", book.Name);
        Assert.Equal("EUR", book.Currency);
        Assert.Equal(BookStatus.Open, book.Status);
        Assert.Equal(ownerId, book.OwnerId);
        Assert.Empty(book.Shares);
    }

    [Fact]
    public void Constructor_SetsCurrencyToNull_WhenNotProvided()
    {
        var ownerId = Guid.NewGuid();
        var book = new Book("Test Book", ownerId);

        Assert.Null(book.Currency);
    }

    [Fact]
    public void Update_ChangesNameAndCurrency()
    {
        var book = new Book("Original", Guid.NewGuid());
        book.Update("Updated", "USD");

        Assert.Equal("Updated", book.Name);
        Assert.Equal("USD", book.Currency);
    }

    [Fact]
    public void Update_SetsCurrencyToNull_WhenNullProvided()
    {
        var book = new Book("Original", Guid.NewGuid(), "EUR");
        book.Update("Updated", null);

        Assert.Equal("Updated", book.Name);
        Assert.Null(book.Currency);
    }

    [Fact]
    public void Close_SetsStatusToClosed_WhenBookIsOpen()
    {
        var book = new Book("Main", Guid.NewGuid());
        var closedAt = DateTimeOffset.UtcNow;

        book.Close(closedAt);

        Assert.Equal(BookStatus.Closed, book.Status);
        Assert.Equal(closedAt, book.ClosedAt);
    }

    [Fact]
    public void Reopen_SetsStatusToOpen_WhenBookIsClosed()
    {
        var book = new Book("Main", Guid.NewGuid());
        book.Close(DateTimeOffset.UtcNow);

        book.Reopen();

        Assert.Equal(BookStatus.Open, book.Status);
        Assert.Null(book.ClosedAt);
    }

    [Fact]
    public void Reopen_DoesNothing_WhenBookIsAlreadyOpen()
    {
        var book = new Book("Main", Guid.NewGuid());

        book.Reopen();

        Assert.Equal(BookStatus.Open, book.Status);
    }
}
