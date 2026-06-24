using ledger12.Application.Services;

namespace ledger12.Tests.Unit.Application;

public class ExchangeRateServiceTests
{
    [Fact]
    public async Task GetExchangeRateAsync_ReturnsRate_WhenApiSucceeds()
    {
        var handler = new MockHttpMessageHandler(_ =>
            Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK)
            {
                Content = new StringContent("{\"rates\":{\"EUR\":0.85}}")
            }));

        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.frankfurter.app") };
        var service = new ExchangeRateService(httpClient);

        var rate = await service.GetExchangeRateAsync("USD", "EUR");

        Assert.Equal(0.85m, rate);
    }

    [Fact]
    public async Task GetExchangeRateAsync_ReturnsNull_WhenApiFails()
    {
        var handler = new MockHttpMessageHandler(_ =>
            Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.InternalServerError)));

        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.frankfurter.app") };
        var service = new ExchangeRateService(httpClient);

        var rate = await service.GetExchangeRateAsync("USD", "EUR");

        Assert.Null(rate);
    }

    [Fact]
    public async Task GetExchangeRateAsync_ReturnsNull_WhenExceptionThrown()
    {
        var handler = new MockHttpMessageHandler(_ =>
            Task.FromException<HttpResponseMessage>(new HttpRequestException("Network error")));

        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.frankfurter.app") };
        var service = new ExchangeRateService(httpClient);

        var rate = await service.GetExchangeRateAsync("USD", "EUR");

        Assert.Null(rate);
    }
}

/// <summary>
/// Mock HTTP message handler for testing HttpClient-based services.
/// </summary>
public class MockHttpMessageHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, Task<HttpResponseMessage>> _handlerFunc;

    public MockHttpMessageHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> handlerFunc)
    {
        _handlerFunc = handlerFunc;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return _handlerFunc(request);
    }
}
