namespace ledger12.Domain.Entities;

public class CurrencyRate
{
    public string FromCurrency { get; private set; }
    public string ToCurrency { get; private set; }
    public decimal Rate { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    private CurrencyRate() { }

    public CurrencyRate(string fromCurrency, string toCurrency, decimal rate)
    {
        FromCurrency = fromCurrency.ToUpperInvariant();
        ToCurrency = toCurrency.ToUpperInvariant();
        Rate = rate;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
