using ledger12.Application.Mappings;
using ledger12.Domain.Entities;

namespace ledger12.Tests.Unit.Application;

public class TransactionMappingsTests
{
    [Fact]
    public void ToDto_MapsAllProperties()
    {
        var dateTime = new DateTimeOffset(2025, 6, 1, 12, 0, 0, TimeSpan.Zero);
        var closedBookId = Guid.NewGuid();
        var tx = new Transaction(
            Guid.NewGuid(), Guid.NewGuid(), dateTime, -100m,
            originalCurrency: "USD", originalAmount: -150m, exchangeRate: 1.5m,
            categoryName: "Food", note: "Lunch",
            isBookClosingEntry: true, closedBookId: closedBookId
        );

        var dto = tx.ToDto();

        Assert.Equal(tx.Id.ToString(), dto.Id);
        Assert.Equal(tx.BookId.ToString(), dto.BookId);
        Assert.Equal(tx.UserId.ToString(), dto.UserId);
        Assert.Equal(dateTime.ToString("o"), dto.DateTime);
        Assert.Equal(-100m, dto.Amount);
        Assert.Equal("USD", dto.OriginalCurrency);
        Assert.Equal(-150m, dto.OriginalAmount);
        Assert.Equal(1.5m, dto.ExchangeRate);
        Assert.Equal("Food", dto.CategoryName);
        Assert.Equal("Lunch", dto.Note);
        Assert.True(dto.IsBookClosingEntry);
        Assert.Equal(closedBookId.ToString(), dto.ClosedBookId);
    }

    [Fact]
    public void ToDto_MapsOptionalFieldsAsNull()
    {
        var tx = new Transaction(Guid.NewGuid(), Guid.NewGuid(), DateTimeOffset.UtcNow, 100m);

        var dto = tx.ToDto();

        Assert.Null(dto.OriginalCurrency);
        Assert.Null(dto.OriginalAmount);
        Assert.Null(dto.ExchangeRate);
        Assert.Null(dto.CategoryName);
        Assert.Null(dto.Note);
        Assert.False(dto.IsBookClosingEntry);
        Assert.Null(dto.ClosedBookId);
    }
}
