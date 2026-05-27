namespace ledger12.Application.DTOs;

public record UpdateCategoryDto(
    string Name,
    string? Color,
    int? DisplayOrder,
    string? Icon
);
