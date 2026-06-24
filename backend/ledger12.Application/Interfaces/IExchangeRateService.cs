namespace ledger12.Application.Interfaces;

public interface IExchangeRateService
{
    Task<decimal?> GetExchangeRateAsync(string from, string to);
}
