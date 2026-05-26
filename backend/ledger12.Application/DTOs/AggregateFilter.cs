namespace ledger12.Application.DTOs;

public record AggregateFilter(
    DateOnly From,
    DateOnly To,
    string? Book,
    string? Author,
    string? Category,
    string? Currency,
    int Page,
    int PageSize
);