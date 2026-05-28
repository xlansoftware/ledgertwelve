using Microsoft.AspNetCore.Mvc;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Domain;
using Microsoft.AspNetCore.Authorization;

namespace ledger12.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<AggregateResponse>>> GetDashboard(
        [FromQuery] string granularity,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] string? book,
        [FromQuery] string? author,
        [FromQuery] string? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        // Validate granularity
        if (!Enum.TryParse<Granularity>(granularity, ignoreCase: true, out var parsedGranularity))
        {
            return BadRequest(new { error = $"Invalid granularity '{granularity}'. Valid values: daily, weekly, monthly, yearly." });
        }

        // Validate pagination
        if (page < 1)
            return BadRequest(new { error = "Page must be 1 or greater." });

        if (pageSize < 1)
            return BadRequest(new { error = "PageSize must be 1 or greater." });

        if (pageSize > 1000)
            return BadRequest(new { error = "PageSize must not exceed 1000." });

        // Validate date range
        if (from.HasValue && to.HasValue && from > to)
            return BadRequest(new { error = "The 'from' date must not be after the 'to' date." });

        var query = new DashboardQuery(from, to, book, author, category, page, pageSize);

        try
        {
            var result = await _dashboardService.GetDashboardAsync(parsedGranularity, query);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}