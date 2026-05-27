namespace ledger12.Application.DTOs;

public record CreateCategoryDto(
    string Name,
    string? Color,
    int? DisplayOrder,
    string? Icon
);
