namespace ledger12.Application.DTOs;

public record CreateTransactionDto(
    decimal Value,
    string Currency,
    string Category,
    string? Author = null,
    DateTimeOffset? Date = null,
    string? Book = null,
    string? Notes = null
);