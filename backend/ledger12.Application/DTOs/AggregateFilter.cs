namespace ledger12.Application.DTOs;

public record AggregateFilter(
    DateOnly From,
    DateOnly To,
    string? Book,
    string? Author,
    string? Category,
    int Page,
    int PageSize
);