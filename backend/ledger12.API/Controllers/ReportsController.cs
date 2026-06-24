using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;

namespace ledger12.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/reports")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;
    private readonly ICurrentUserService _currentUser;

    public ReportsController(IReportService reportService, ICurrentUserService currentUser)
    {
        _reportService = reportService;
        _currentUser = currentUser;
    }

    [HttpGet("totals")]
    public async Task<ActionResult<List<TotalsReportItem>>> GetTotals(
        [FromQuery] string? period,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to)
    {
        var result = await _reportService.GetTotalsReportAsync(period, from, to, _currentUser.UserId);
        return Ok(new { data = result });
    }

    [HttpGet("categories")]
    public async Task<ActionResult<List<CategoryReportItem>>> GetCategories(
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to)
    {
        var result = await _reportService.GetCategoryReportAsync(from, to, _currentUser.UserId);
        return Ok(new { data = result });
    }

    [HttpGet("daily")]
    public async Task<ActionResult<List<DailyReportItem>>> GetDaily(
        [FromQuery] DateTimeOffset from,
        [FromQuery] DateTimeOffset to)
    {
        if (from == default || to == default)
            return BadRequest(new { error = "from and to query parameters are required" });
        var result = await _reportService.GetDailyReportAsync(from, to, _currentUser.UserId);
        return Ok(new { data = result });
    }

    [HttpGet("monthly")]
    public async Task<ActionResult<List<MonthlyReportItem>>> GetMonthly(
        [FromQuery] DateTimeOffset from,
        [FromQuery] DateTimeOffset to)
    {
        if (from == default || to == default)
            return BadRequest(new { error = "from and to query parameters are required" });
        var result = await _reportService.GetMonthlyReportAsync(from, to, _currentUser.UserId);
        return Ok(new { data = result });
    }

    [HttpGet("average/daily")]
    public async Task<ActionResult<AverageReportItem>> GetAverageDaily(
        [FromQuery] DateTimeOffset from,
        [FromQuery] DateTimeOffset to)
    {
        if (from == default || to == default)
            return BadRequest(new { error = "from and to query parameters are required" });
        var result = await _reportService.GetAverageDailyAsync(from, to, _currentUser.UserId);
        return Ok(new { data = result });
    }

    [HttpGet("average/monthly")]
    public async Task<ActionResult<AverageReportItem>> GetAverageMonthly(
        [FromQuery] DateTimeOffset from,
        [FromQuery] DateTimeOffset to)
    {
        if (from == default || to == default)
            return BadRequest(new { error = "from and to query parameters are required" });
        var result = await _reportService.GetAverageMonthlyAsync(from, to, _currentUser.UserId);
        return Ok(new { data = result });
    }
}
