namespace ledger12.Application.DTOs;

public record TransactionResponse(
    Guid Id,
    decimal Value,
    string Category,
    string Author,
    string? Book,
    string? Notes,
    DateTimeOffset Date
);