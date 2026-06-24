using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;

namespace ledger12.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/categories")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;
    private readonly ICurrentUserService _currentUser;

    public CategoriesController(ICategoryService categoryService, ICurrentUserService currentUser)
    {
        _categoryService = categoryService;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<List<CategoryDto>>> GetCategories()
    {
        var categories = await _categoryService.GetCategoriesAsync(_currentUser.UserId);
        return Ok(new { data = categories });
    }

    [HttpPost]
    public async Task<ActionResult<CategoryDto>> CreateCategory([FromBody] CreateCategoryRequest request)
    {
        var category = await _categoryService.CreateCategoryAsync(request, _currentUser.UserId);
        return CreatedAtAction(nameof(GetCategories), new { data = category });
    }

    [HttpPut("{categoryId}")]
    public async Task<ActionResult<CategoryDto>> UpdateCategory(Guid categoryId, [FromBody] UpdateCategoryRequest request)
    {
        var category = await _categoryService.UpdateCategoryAsync(categoryId, request, _currentUser.UserId);
        return Ok(new { data = category });
    }

    [HttpDelete("{categoryId}")]
    public async Task<ActionResult<DeleteCategoryResponse>> DeleteCategory(
        Guid categoryId, [FromQuery] string? replacementCategoryName = null)
    {
        var result = await _categoryService.DeleteCategoryAsync(categoryId, replacementCategoryName, _currentUser.UserId);
        return Ok(new { data = result });
    }

    [HttpPost("reassign")]
    public async Task<ActionResult<ReassignCategoryResponse>> Reassign([FromBody] ReassignRequest request)
    {
        var result = await _categoryService.ReassignAsync(request, _currentUser.UserId);
        return Ok(new { data = result });
    }

    [HttpPut("reorder")]
    public async Task<ActionResult<ReorderResponse>> Reorder([FromBody] ReorderRequest request)
    {
        var result = await _categoryService.ReorderAsync(request, _currentUser.UserId);
        return Ok(new { data = result });
    }
}
