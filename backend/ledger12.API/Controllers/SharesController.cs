using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;

namespace ledger12.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/books/{bookId}/shares")]
public class SharesController : ControllerBase
{
    private readonly IBookService _bookService;
    private readonly ICurrentUserService _currentUser;

    public SharesController(IBookService bookService, ICurrentUserService currentUser)
    {
        _bookService = bookService;
        _currentUser = currentUser;
    }

    [HttpPost]
    public async Task<ActionResult<CreateShareResponse>> AddShare(Guid bookId, [FromBody] AddShareRequest request)
    {
        var result = await _bookService.AddShareAsync(bookId, request, _currentUser.UserId);
        return Created($"/api/v1/books/{bookId}/shares/{result.UserId}", new { data = result });
    }

    [HttpPut("{userId}")]
    public async Task<ActionResult> UpdateShare(Guid bookId, Guid userId, [FromBody] UpdateShareRequest request)
    {
        await _bookService.UpdateShareAsync(bookId, userId, request, _currentUser.UserId);
        return Ok(new { data = new { success = true } });
    }

    [HttpDelete("{userId}")]
    public async Task<ActionResult> RemoveShare(Guid bookId, Guid userId)
    {
        await _bookService.RemoveShareAsync(bookId, userId, _currentUser.UserId);
        return Ok(new { data = new { success = true } });
    }
}

[ApiController]
[Authorize]
[Route("api/v1/shares")]
public class GlobalSharesController : ControllerBase
{
    private readonly IBookService _bookService;
    private readonly ICurrentUserService _currentUser;

    public GlobalSharesController(IBookService bookService, ICurrentUserService currentUser)
    {
        _bookService = bookService;
        _currentUser = currentUser;
    }

    [HttpPost]
    public async Task<ActionResult<CreateShareResponse>> AddGlobalShare([FromBody] AddShareRequest request)
    {
        var result = await _bookService.AddGlobalShareAsync(request, _currentUser.UserId);
        return Created($"/api/v1/shares/{result.UserId}", new { data = result });
    }

    [HttpDelete("{userId}")]
    public async Task<ActionResult> RemoveGlobalShare(Guid userId)
    {
        var result = await _bookService.RemoveGlobalShareAsync(userId, _currentUser.UserId);
        return Ok(new { data = result });
    }
}
