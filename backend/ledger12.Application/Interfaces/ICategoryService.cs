using ledger12.Application.DTOs;

namespace ledger12.Application.Interfaces;

public interface ICategoryService
{
    Task<List<CategoryDto>> GetCategoriesAsync(Guid userId);
    Task<CategoryDto> CreateCategoryAsync(CreateCategoryRequest request, Guid userId);
    Task<CategoryDto> UpdateCategoryAsync(Guid categoryId, UpdateCategoryRequest request, Guid userId);
    Task<DeleteCategoryResponse> DeleteCategoryAsync(Guid categoryId, string? replacementCategoryName, Guid userId);
    Task<ReassignCategoryResponse> ReassignAsync(ReassignRequest request, Guid userId);
    Task<ReorderResponse> ReorderAsync(ReorderRequest request, Guid userId);
}
