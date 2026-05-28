using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Domain;

namespace ledger12.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class BooksController : ControllerBase
{
    private readonly IBookRepository _repository;

    public BooksController(IBookRepository repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<ActionResult<List<BookResponse>>> GetAll()
    {
        var books = await _repository.GetAllAsync();
        return Ok(books.Select(ToResponse).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<BookResponse>> Create([FromBody] CreateBookDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { error = "Book name is required." });

        if (dto.Name.Trim().Length > 100)
            return BadRequest(new { error = "Book name must not exceed 100 characters." });

        if (dto.Currency == null)
            return BadRequest(new { error = "Currency is required." });

        if (dto.Currency.Trim().Length > 10)
            return BadRequest(new { error = "Currency must not exceed 10 characters." });

        var exists = await _repository.ExistsByNameAsync(dto.Name);
        if (exists)
            return Conflict(new { error = $"A book with the name '{dto.Name.Trim()}' already exists." });

        var book = new Book(dto.Name, dto.Currency, dto.Color, dto.Status);
        var created = await _repository.AddAsync(book);

        var response = ToResponse(created);
        return CreatedAtAction(nameof(GetAll), new { id = response.Id }, response);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<BookResponse>> Update(Guid id, [FromBody] UpdateBookDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { error = "Book name is required." });

        if (dto.Name.Trim().Length > 100)
            return BadRequest(new { error = "Book name must not exceed 100 characters." });

        if (dto.Currency == null)
            return BadRequest(new { error = "Currency is required." });

        if (dto.Currency.Trim().Length > 10)
            return BadRequest(new { error = "Currency must not exceed 10 characters." });

        var book = await _repository.GetByIdAsync(id);
        if (book is null)
            return NotFound(new { error = $"Book with id '{id}' not found." });

        var duplicate = await _repository.ExistsByNameAsync(dto.Name, excludeId: id);
        if (duplicate)
            return Conflict(new { error = $"A book with the name '{dto.Name.Trim()}' already exists." });

        book.Update(dto.Name, dto.Currency, dto.Color, dto.Status);
        var updated = await _repository.UpdateAsync(book);

        return Ok(ToResponse(updated));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var book = await _repository.GetByIdAsync(id);
        if (book is null)
            return NotFound(new { error = $"Book with id '{id}' not found." });

        await _repository.DeleteAsync(book);
        return NoContent();
    }

    private static BookResponse ToResponse(Book book)
    {
        return new BookResponse(
            book.Id,
            book.Name,
            book.Currency,
            book.Color,
            book.Status
        );
    }
}
