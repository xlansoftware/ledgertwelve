using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Domain;

namespace ledger12.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryRepository _repository;

    public CategoriesController(ICategoryRepository repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<ActionResult<List<CategoryResponse>>> GetAll()
    {
        var categories = await _repository.GetAllAsync();
        return Ok(categories.Select(ToResponse).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<CategoryResponse>> Create([FromBody] CreateCategoryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { error = "Category name is required." });

        if (dto.Name.Trim().Length > 100)
            return BadRequest(new { error = "Category name must not exceed 100 characters." });

        var exists = await _repository.ExistsByNameAsync(dto.Name);
        if (exists)
            return Conflict(new { error = $"A category with the name '{dto.Name.Trim()}' already exists." });

        var category = new Category(dto.Name, dto.Color, dto.DisplayOrder, dto.Icon);
        var created = await _repository.AddAsync(category);

        var response = ToResponse(created);
        return CreatedAtAction(nameof(GetAll), new { id = response.Id }, response);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CategoryResponse>> Update(Guid id, [FromBody] UpdateCategoryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { error = "Category name is required." });

        if (dto.Name.Trim().Length > 100)
            return BadRequest(new { error = "Category name must not exceed 100 characters." });

        var category = await _repository.GetByIdAsync(id);
        if (category is null)
            return NotFound(new { error = $"Category with id '{id}' not found." });

        var duplicate = await _repository.ExistsByNameAsync(dto.Name, excludeId: id);
        if (duplicate)
            return Conflict(new { error = $"A category with the name '{dto.Name.Trim()}' already exists." });

        category.Update(dto.Name, dto.Color, dto.DisplayOrder, dto.Icon);
        var updated = await _repository.UpdateAsync(category);

        return Ok(ToResponse(updated));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var category = await _repository.GetByIdAsync(id);
        if (category is null)
            return NotFound(new { error = $"Category with id '{id}' not found." });

        await _repository.DeleteAsync(category);
        return NoContent();
    }

    private static CategoryResponse ToResponse(Category category)
    {
        return new CategoryResponse(
            category.Id,
            category.Name,
            category.Color,
            category.DisplayOrder,
            category.Icon
        );
    }
}
