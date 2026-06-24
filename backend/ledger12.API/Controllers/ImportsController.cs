using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;

namespace ledger12.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/imports")]
public class ImportsController : ControllerBase
{
    private readonly IImportService _importService;
    private readonly ICurrentUserService _currentUser;

    public ImportsController(IImportService importService, ICurrentUserService currentUser)
    {
        _importService = importService;
        _currentUser = currentUser;
    }

    [HttpPost]
    public async Task<ActionResult<ImportResponse>> Import([FromBody] ImportRequest request)
    {
        var result = await _importService.ImportAsync(request, _currentUser.UserId);
        return Ok(result);
    }
}
