using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;

namespace ledger12.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/transactions")]
public class TransactionsController : ControllerBase
{
    private readonly ITransactionService _transactionService;
    private readonly ICurrentUserService _currentUser;

    public TransactionsController(ITransactionService transactionService, ICurrentUserService currentUser)
    {
        _transactionService = transactionService;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<TransactionDto>>> SearchTransactions(
        [FromQuery] Guid? bookId,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] List<string>? category,
        [FromQuery] List<Guid>? createdBy,
        [FromQuery] string? note,
        [FromQuery] decimal? minValue,
        [FromQuery] decimal? maxValue,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var result = await _transactionService.SearchAsync(
            bookId, from, to, category, createdBy, note, minValue, maxValue, page, pageSize, _currentUser.UserId);
        return Ok(result);
    }

    [HttpGet("{transactionId}")]
    public async Task<ActionResult<TransactionDto>> GetTransaction(Guid transactionId)
    {
        var transaction = await _transactionService.GetByIdAsync(transactionId, _currentUser.UserId);
        return Ok(new { data = transaction });
    }

    [HttpPost]
    public async Task<ActionResult<TransactionDto>> CreateTransaction([FromBody] CreateTransactionRequest request)
    {
        var transaction = await _transactionService.CreateAsync(request, _currentUser.UserId);
        return CreatedAtAction(nameof(GetTransaction), new { transactionId = transaction.Id }, new { data = transaction });
    }

    [HttpPut("{transactionId}")]
    public async Task<ActionResult<TransactionDto>> UpdateTransaction(Guid transactionId, [FromBody] UpdateTransactionRequest request)
    {
        var transaction = await _transactionService.UpdateAsync(transactionId, request, _currentUser.UserId);
        return Ok(new { data = transaction });
    }

    [HttpDelete("{transactionId}")]
    public async Task<ActionResult<DeleteTransactionResponse>> DeleteTransaction(Guid transactionId)
    {
        var result = await _transactionService.DeleteAsync(transactionId, _currentUser.UserId);
        return Ok(new { data = result });
    }
}
