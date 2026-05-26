namespace ledger12.Application.DTOs;

public record DashboardQuery(
    DateOnly? From,
    DateOnly? To,
    string? Book,
    string? Author,
    string? Category,
    string? Currency,
    int Page = 1,
    int PageSize = 20
);