namespace ledger12.Application.DTOs;

public record UpdateBookDto(
    string Name,
    string? Currency,
    string? Color,
    string? Status
);
