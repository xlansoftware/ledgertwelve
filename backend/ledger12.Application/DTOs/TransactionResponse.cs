namespace ledger12.Application.DTOs;

public record TransactionResponse(
    Guid Id,
    decimal Value,
    string Currency,
    string Category,
    string Author,
    string? Book,
    DateTimeOffset Date
);