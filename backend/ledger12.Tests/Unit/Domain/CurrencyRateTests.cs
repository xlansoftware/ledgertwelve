using ledger12.Domain.Entities;

namespace ledger12.Tests.Unit.Domain;

public class CurrencyRateTests
{
    [Fact]
    public void Constructor_SetsProperties()
    {
        var rate = new CurrencyRate("usd", "eur", 0.85m);

        Assert.Equal("USD", rate.FromCurrency);
        Assert.Equal("EUR", rate.ToCurrency);
        Assert.Equal(0.85m, rate.Rate);
    }

    [Fact]
    public void Constructor_UppercasesCurrencyCodes()
    {
        var rate = new CurrencyRate("gbp", "jpy", 185.5m);

        Assert.Equal("GBP", rate.FromCurrency);
        Assert.Equal("JPY", rate.ToCurrency);
    }
}
