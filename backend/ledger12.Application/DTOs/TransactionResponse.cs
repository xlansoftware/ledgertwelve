namespace ledger12.Application.DTOs;

public record TransactionResponse(
    Guid Id,
    decimal Value,
    decimal? ValueInBookCurrency,
    string Currency,
    string Category,
    string Author,
    string? Book,
    string? Notes,
    DateTimeOffset Date
);