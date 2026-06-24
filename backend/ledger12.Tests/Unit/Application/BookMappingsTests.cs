using ledger12.Application.Mappings;
using ledger12.Domain.Entities;
using ledger12.Domain.Enums;

namespace ledger12.Tests.Unit.Application;

public class BookMappingsTests
{
    [Fact]
    public void ToDto_MapsAllProperties()
    {
        var ownerId = Guid.NewGuid();
        var book = new Book("Test Book", ownerId, "EUR");

        var dto = book.ToDto();

        Assert.Equal(book.Id.ToString(), dto.Id);
        Assert.Equal("Test Book", dto.Name);
        Assert.Equal("EUR", dto.Currency);
        Assert.Equal("open", dto.Status);
        Assert.Equal(ownerId.ToString(), dto.OwnerId);
        Assert.Empty(dto.SharedWith);
        Assert.Equal(book.CreatedAt.ToString("o"), dto.CreatedAt);
        Assert.Null(dto.ClosedAt);
    }

    [Fact]
    public void ToDto_MapsShares()
    {
        var book = new Book("Test", Guid.NewGuid(), "EUR");
        var sharedUserId = Guid.NewGuid();
        var share = new BookShare(book.Id, sharedUserId, BookPermission.View);
        book.Shares.Add(share);

        var dto = book.ToDto();

        Assert.Single(dto.SharedWith);
        Assert.Equal(sharedUserId.ToString(), dto.SharedWith[0].UserId);
        Assert.Equal("view", dto.SharedWith[0].Permission);
    }

    [Fact]
    public void ToDto_MapsEditShare()
    {
        var book = new Book("Test", Guid.NewGuid(), "EUR");
        var sharedUserId = Guid.NewGuid();
        var share = new BookShare(book.Id, sharedUserId, BookPermission.Edit);
        book.Shares.Add(share);

        var dto = book.ToDto();

        Assert.Equal("edit", dto.SharedWith[0].Permission);
    }

    [Fact]
    public void ToDto_MapsClosedBook()
    {
        var book = new Book("Test", Guid.NewGuid(), "EUR");
        var closedAt = new DateTimeOffset(2025, 6, 1, 0, 0, 0, TimeSpan.Zero);
        book.Close(closedAt);

        var dto = book.ToDto();

        Assert.Equal("closed", dto.Status);
        Assert.Equal(closedAt.ToString("o"), dto.ClosedAt);
    }
}
