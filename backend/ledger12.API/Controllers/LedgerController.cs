using Microsoft.AspNetCore.Mvc;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
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

        var response = new TransactionResponse(
            transaction.Id,
            transaction.Value,
            transaction.Currency,
            transaction.Category,
            transaction.Author,
            transaction.Date
        );

        return CreatedAtAction(nameof(CreateTransaction), new { id = response.Id }, response);
    }
}