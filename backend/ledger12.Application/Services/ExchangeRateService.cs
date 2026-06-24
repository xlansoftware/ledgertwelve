using ledger12.Application.Interfaces;

namespace ledger12.Application.Services;

public class ExchangeRateService : IExchangeRateService
{
    private readonly HttpClient _httpClient;

    public ExchangeRateService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<decimal?> GetExchangeRateAsync(string from, string to)
    {
        try
        {
            var url = $"https://api.frankfurter.app/latest?from={Uri.EscapeDataString(from)}&to={Uri.EscapeDataString(to)}";
            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            var doc = System.Text.Json.JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("rates", out var rates) &&
                rates.TryGetProperty(to.ToUpperInvariant(), out var rate))
            {
                return rate.GetDecimal();
            }

            return null;
        }
        catch
        {
            return null;
        }
    }
}
