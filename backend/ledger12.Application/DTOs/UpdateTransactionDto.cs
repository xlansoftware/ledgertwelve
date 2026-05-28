namespace ledger12.Application.DTOs;

public record UpdateTransactionDto(
    decimal Value,
    string Category,
    string Author,
    DateTimeOffset Date,
    string? Book = null,
    string? Notes = null
);
