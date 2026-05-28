namespace ledger12.Application.DTOs;

public record CreateBookDto(
    string Name,
    string Currency,
    string? Color,
    string? Status
);
