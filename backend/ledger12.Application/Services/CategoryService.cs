using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Domain.Entities;
using ledger12.Domain.Exceptions;

namespace ledger12.Application.Services;

public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _categoryRepo;

    public CategoryService(ICategoryRepository categoryRepo)
    {
        _categoryRepo = categoryRepo;
    }

    public async Task<List<CategoryDto>> GetCategoriesAsync(Guid userId)
    {
        var categories = await _categoryRepo.GetByUserAsync(userId);
        return categories.OrderBy(c => c.Order).Select(MapToDto).ToList();
    }

    public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryRequest request, Guid userId)
    {
        var maxOrder = await _categoryRepo.GetMaxOrderAsync(userId);
        var category = new Category(
            request.Name,
            userId,
            request.Color,
            request.Icon,
            maxOrder + 1,
            request.Recurring ?? false
        );
        await _categoryRepo.AddAsync(category);
        return MapToDto(category);
    }

    public async Task<CategoryDto> UpdateCategoryAsync(Guid categoryId, UpdateCategoryRequest request, Guid userId)
    {
        var category = await _categoryRepo.GetByIdAsync(categoryId);
        if (category == null || category.UserId != userId)
            throw new NotFoundException("Category", categoryId);

        category.Update(request.Name, request.Recurring, request.Color, request.Icon);
        await _categoryRepo.UpdateAsync(category);
        return MapToDto(category);
    }

    public async Task<DeleteCategoryResponse> DeleteCategoryAsync(Guid categoryId, string? replacementCategoryName, Guid userId)
    {
        var category = await _categoryRepo.GetByIdAsync(categoryId);
        if (category == null || category.UserId != userId)
            throw new NotFoundException("Category", categoryId);

        var reassignedCount = 0;

        if (!string.IsNullOrWhiteSpace(replacementCategoryName))
        {
            reassignedCount = await _categoryRepo.ReassignTransactionsAsync(category.Name, replacementCategoryName, userId);
        }

        await _categoryRepo.DeleteAsync(category);
        return new DeleteCategoryResponse(reassignedCount);
    }

    public async Task<ReassignCategoryResponse> ReassignAsync(ReassignRequest request, Guid userId)
    {
        var affected = await _categoryRepo.ReassignTransactionsAsync(request.FromCategoryName, request.ToCategoryName, userId);
        return new ReassignCategoryResponse(affected);
    }

    public async Task<ReorderResponse> ReorderAsync(ReorderRequest request, Guid userId)
    {
        if (request.OrderedIds == null || request.OrderedIds.Count == 0)
            throw new DomainException("orderedIds must contain all user categories");

        var categories = await _categoryRepo.GetByUserAsync(userId);
        if (request.OrderedIds.Count != categories.Count)
            throw new DomainException("orderedIds must contain all user categories");

        var categoryMap = categories.ToDictionary(c => c.Id.ToString());

        for (int i = 0; i < request.OrderedIds.Count; i++)
        {
            if (categoryMap.TryGetValue(request.OrderedIds[i], out var cat))
            {
                cat.SetOrder(i + 1);
                await _categoryRepo.UpdateAsync(cat);
            }
        }

        return new ReorderResponse(true);
    }

    private static CategoryDto MapToDto(Category c) => new(
        c.Id.ToString(),
        c.Name,
        c.Recurring,
        c.Color,
        c.Icon,
        c.Order,
        c.CreatedAt.ToString("o")
    );
}
