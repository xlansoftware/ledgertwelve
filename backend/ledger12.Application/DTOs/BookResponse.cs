namespace ledger12.Application.DTOs;

public record BookResponse(
    Guid Id,
    string Name,
    string Currency,
    string? Color,
    string? Status
);
