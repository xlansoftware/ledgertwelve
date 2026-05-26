namespace ledger12.Application.DTOs;

public record AggregateResponse(
    DateOnly PeriodStart,
    string Book,
    string Author,
    string Category,
    string Currency,
    decimal SumValue,
    int TransactionCount
);