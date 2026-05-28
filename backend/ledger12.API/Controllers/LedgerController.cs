using Microsoft.AspNetCore.Mvc;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Domain;
using Microsoft.AspNetCore.Authorization;

namespace ledger12.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class LedgerController : ControllerBase
{
    private readonly ILedgerService _ledgerService;

    public LedgerController(ILedgerService ledgerService)
    {
        _ledgerService = ledgerService;
    }

    [HttpPost("transaction")]
    public async Task<ActionResult<TransactionResponse>> CreateTransaction([FromBody] CreateTransactionDto dto)
    {
        var currentUser = HttpContext.User.Identity?.Name;
        var transaction = await _ledgerService.CreateTransactionAsync(dto, currentUser);

        var response = ToResponse(transaction);

        return CreatedAtAction(nameof(CreateTransaction), new { id = response.Id }, response);
    }

    [HttpGet("transactions")]
    public async Task<ActionResult<PagedResult<TransactionResponse>>> GetTransactions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? book = null,
        [FromQuery] string? author = null,
        [FromQuery] string? category = null,
        [FromQuery] string? currency = null)
    {
        if (page < 1)
            return BadRequest(new { error = "Page must be 1 or greater." });

        if (pageSize < 1)
            return BadRequest(new { error = "PageSize must be 1 or greater." });

        if (pageSize > 1000)
            return BadRequest(new { error = "PageSize must not exceed 1000." });

        var result = await _ledgerService.GetTransactionsAsync(page, pageSize, book, author, category, currency);

        var response = new PagedResult<TransactionResponse>(
            result.Items.Select(ToResponse).ToList(),
            result.TotalCount,
            result.Page,
            result.PageSize
        );

        return Ok(response);
    }

    [HttpGet("transactions/{id:guid}")]
    public async Task<ActionResult<TransactionResponse>> GetTransactionById(Guid id)
    {
        var transaction = await _ledgerService.GetTransactionByIdAsync(id);

        if (transaction is null)
            return NotFound(new { error = $"Transaction with id '{id}' not found." });

        return Ok(ToResponse(transaction));
    }

    [HttpPut("transactions/{id:guid}")]
    public async Task<ActionResult<TransactionResponse>> UpdateTransaction(Guid id, [FromBody] UpdateTransactionDto dto)
    {
        try
        {
            var transaction = await _ledgerService.UpdateTransactionAsync(id, dto);
            return Ok(ToResponse(transaction));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpDelete("transactions/{id:guid}")]
    public async Task<ActionResult> DeleteTransaction(Guid id)
    {
        try
        {
            await _ledgerService.DeleteTransactionAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    private static TransactionResponse ToResponse(Transaction transaction)
    {
        return new TransactionResponse(
            transaction.Id,
            transaction.Value,
            transaction.Category,
            transaction.Author,
            transaction.Book,
            transaction.Notes,
            transaction.Date
        );
    }
}