namespace ledger12.Application.DTOs;

public record CategoryResponse(
    Guid Id,
    string Name,
    string? Color,
    int? DisplayOrder,
    string? Icon
);
