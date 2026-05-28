namespace ledger12.Application.DTOs;

public record AggregateResponse(
    DateOnly PeriodStart,
    string Book,
    string Author,
    string Category,
    decimal SumValue,
    int TransactionCount
);