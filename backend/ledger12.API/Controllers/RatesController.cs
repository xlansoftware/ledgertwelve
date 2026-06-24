using Microsoft.AspNetCore.Mvc;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;

namespace ledger12.API.Controllers;

[ApiController]
[Route("api/v1/rates")]
public class RatesController : ControllerBase
{
    private readonly IExchangeRateService _exchangeRateService;

    public RatesController(IExchangeRateService exchangeRateService)
    {
        _exchangeRateService = exchangeRateService;
    }

    [HttpGet("exchange")]
    public async Task<ActionResult<ExchangeRateResponse>> GetExchangeRate([FromQuery] string from, [FromQuery] string to)
    {
        if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
            return BadRequest(new { error = "from and to query parameters are required" });

        var rate = await _exchangeRateService.GetExchangeRateAsync(from, to);
        if (rate == null)
            return BadRequest(new { error = $"Invalid currency code: {from.ToUpperInvariant()}" });

        return Ok(new { data = new ExchangeRateResponse(from.ToUpperInvariant(), to.ToUpperInvariant(), rate.Value) });
    }
}
