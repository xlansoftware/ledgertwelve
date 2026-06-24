using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;

namespace ledger12.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/books")]
public class BooksController : ControllerBase
{
    private readonly IBookService _bookService;
    private readonly ICurrentUserService _currentUser;

    public BooksController(IBookService bookService, ICurrentUserService currentUser)
    {
        _bookService = bookService;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<List<BookDto>>> GetBooks()
    {
        var books = await _bookService.GetBooksAsync(_currentUser.UserId);
        return Ok(new { data = books });
    }

    [HttpGet("{bookId}")]
    public async Task<ActionResult<BookDto>> GetBook(Guid bookId)
    {
        var book = await _bookService.GetBookAsync(bookId, _currentUser.UserId);
        return Ok(new { data = book });
    }

    [HttpPost]
    public async Task<ActionResult<BookDto>> CreateBook([FromBody] CreateBookRequest request)
    {
        var book = await _bookService.CreateBookAsync(request, _currentUser.UserId);
        return CreatedAtAction(nameof(GetBook), new { bookId = book.Id }, new { data = book });
    }

    [HttpPut("{bookId}")]
    public async Task<ActionResult<BookDto>> UpdateBook(Guid bookId, [FromBody] UpdateBookRequest request)
    {
        var book = await _bookService.UpdateBookAsync(bookId, request, _currentUser.UserId);
        return Ok(new { data = book });
    }

    [HttpDelete("{bookId}")]
    public async Task<ActionResult> DeleteBook(Guid bookId)
    {
        await _bookService.DeleteBookAsync(bookId, _currentUser.UserId);
        return NoContent();
    }

    [HttpGet("{bookId}/stats")]
    public async Task<ActionResult<BookStatsResponse>> GetBookStats(Guid bookId, [FromQuery] DateTimeOffset? asOf = null)
    {
        var stats = await _bookService.GetBookStatsAsync(bookId, _currentUser.UserId, asOf);
        return Ok(new { data = stats });
    }

    [HttpGet("current")]
    public async Task<ActionResult<BookDto>> GetCurrentBook()
    {
        var book = await _bookService.GetCurrentBookAsync(_currentUser.UserId);
        return Ok(new { data = book });
    }

    [HttpPut("current")]
    public async Task<ActionResult<BookDto>> SetCurrentBook([FromBody] SetCurrentBookRequest request)
    {
        var book = await _bookService.SetCurrentBookAsync(Guid.Parse(request.BookId), _currentUser.UserId);
        return Ok(new { data = book });
    }

    [HttpPost("{bookId}/close")]
    public async Task<ActionResult<CloseBookResponse>> CloseBook(Guid bookId, [FromBody] CloseBookRequest request)
    {
        var result = await _bookService.CloseBookAsync(bookId, request, _currentUser.UserId);
        return Ok(new { data = result });
    }

    [HttpPost("{bookId}/reopen")]
    public async Task<ActionResult<ReopenBookResponse>> ReopenBook(Guid bookId)
    {
        var result = await _bookService.ReopenBookAsync(bookId, _currentUser.UserId);
        return Ok(new { data = result });
    }
}
