using System.Threading.Channels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Domain.Entities;

namespace ledger12.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/exports")]
public class ExportsController : ControllerBase
{
    private readonly IExportService _exportService;
    private readonly ICurrentUserService _currentUser;
    private readonly Channel<Guid> _exportChannel;

    public ExportsController(
        IExportService exportService,
        ICurrentUserService currentUser,
        Channel<Guid> exportChannel)
    {
        _exportService = exportService;
        _currentUser = currentUser;
        _exportChannel = exportChannel;
    }

    [HttpPost]
    public async Task<ActionResult<ExportResponse>> CreateExport([FromBody] CreateExportRequest request)
    {
        var result = await _exportService.CreateExportJobAsync(request, _currentUser.UserId);
        // Queue for background processing
        if (Guid.TryParse(result.JobId, out var jobId))
        {
            await _exportChannel.Writer.WriteAsync(jobId);
        }
        return Created($"/api/v1/exports/{result.JobId}", new { data = result });
    }

    [HttpGet("{jobId}")]
    public async Task<ActionResult<ExportStatusResponse>> GetExportStatus(Guid jobId)
    {
        var result = await _exportService.GetExportStatusAsync(jobId, _currentUser.UserId);
        return Ok(new { data = result });
    }

    [HttpGet("{jobId}/download")]
    public async Task<ActionResult> DownloadExport(Guid jobId)
    {
        var (data, contentType, fileName) = await _exportService.DownloadExportAsync(jobId, _currentUser.UserId);
        return File(data, contentType, fileName);
    }
}
