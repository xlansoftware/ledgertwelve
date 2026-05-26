namespace ledger12.Application.DTOs;

public record CreateTransactionDto(
    decimal Value,
    string Currency,
    string Category,
    string Author,
    DateTimeOffset Date
);