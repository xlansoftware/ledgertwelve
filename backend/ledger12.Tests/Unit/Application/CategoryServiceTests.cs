using Moq;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Application.Services;
using ledger12.Domain.Entities;
using ledger12.Domain.Exceptions;

namespace ledger12.Tests.Unit.Application;

public class CategoryServiceTests
{
    private readonly Mock<ICategoryRepository> _categoryRepo;
    private readonly CategoryService _service;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _otherUserId = Guid.NewGuid();

    public CategoryServiceTests()
    {
        _categoryRepo = new Mock<ICategoryRepository>();
        _service = new CategoryService(_categoryRepo.Object);
    }

    [Fact]
    public async Task GetCategoriesAsync_ReturnsOrderedDtos()
    {
        var categories = new List<Category>
        {
            new("B", _userId, null, null, 2, false) ,
            new("A", _userId, null, null, 1, false)
        };
        _categoryRepo.Setup(r => r.GetByUserAsync(_userId)).ReturnsAsync(categories);

        var result = await _service.GetCategoriesAsync(_userId);

        Assert.Equal(2, result.Count);
        Assert.Equal("A", result[0].Name);
        Assert.Equal("B", result[1].Name);
    }

    [Fact]
    public async Task GetCategoriesAsync_ReturnsEmptyList_WhenNoCategories()
    {
        _categoryRepo.Setup(r => r.GetByUserAsync(_userId)).ReturnsAsync(new List<Category>());

        var result = await _service.GetCategoriesAsync(_userId);

        Assert.Empty(result);
    }

    [Fact]
    public async Task CreateCategoryAsync_ReturnsDto_WhenValidRequest()
    {
        _categoryRepo.Setup(r => r.GetMaxOrderAsync(_userId)).ReturnsAsync(3);
        _categoryRepo.Setup(r => r.AddAsync(It.IsAny<Category>())).Returns(Task.CompletedTask);

        var request = new CreateCategoryRequest("New Cat", false, "#fff", "icon");
        var result = await _service.CreateCategoryAsync(request, _userId);

        Assert.Equal("New Cat", result.Name);
        Assert.Equal(4, result.Order); // maxOrder + 1
        _categoryRepo.Verify(r => r.AddAsync(It.Is<Category>(c =>
            c.Name == "New Cat" && c.Order == 4)), Times.Once);
    }

    [Fact]
    public async Task UpdateCategoryAsync_ReturnsDto_WhenOwner()
    {
        var categoryId = Guid.NewGuid();
        var category = new Category("Old", _userId);
        _categoryRepo.Setup(r => r.GetByIdAsync(categoryId)).ReturnsAsync(category);
        _categoryRepo.Setup(r => r.UpdateAsync(It.IsAny<Category>())).Returns(Task.CompletedTask);

        var result = await _service.UpdateCategoryAsync(categoryId, new UpdateCategoryRequest("Updated", true, "#000", "new-icon"), _userId);

        Assert.Equal("Updated", result.Name);
        Assert.True(result.Recurring);
    }

    [Fact]
    public async Task UpdateCategoryAsync_ThrowsNotFoundException_WhenNotOwner()
    {
        var categoryId = Guid.NewGuid();
        var category = new Category("Test", _otherUserId);
        _categoryRepo.Setup(r => r.GetByIdAsync(categoryId)).ReturnsAsync(category);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _service.UpdateCategoryAsync(categoryId, new UpdateCategoryRequest("Updated", null, null, null), _userId));
    }

    [Fact]
    public async Task UpdateCategoryAsync_ThrowsNotFoundException_WhenNotFound()
    {
        _categoryRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((Category?)null);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _service.UpdateCategoryAsync(Guid.NewGuid(), new UpdateCategoryRequest("Updated", null, null, null), _userId));
    }

    [Fact]
    public async Task DeleteCategoryAsync_DeletesWithoutReassignment_WhenNoReplacement()
    {
        var categoryId = Guid.NewGuid();
        var category = new Category("Test", _userId);
        _categoryRepo.Setup(r => r.GetByIdAsync(categoryId)).ReturnsAsync(category);
        _categoryRepo.Setup(r => r.DeleteAsync(It.IsAny<Category>())).Returns(Task.CompletedTask);

        var result = await _service.DeleteCategoryAsync(categoryId, null, _userId);

        Assert.Equal(0, result.ReassignedTransactions);
        _categoryRepo.Verify(r => r.DeleteAsync(category), Times.Once);
        _categoryRepo.Verify(r => r.ReassignTransactionsAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task DeleteCategoryAsync_ReassignsTransactions_WhenReplacementProvided()
    {
        var categoryId = Guid.NewGuid();
        var category = new Category("Old", _userId);
        _categoryRepo.Setup(r => r.GetByIdAsync(categoryId)).ReturnsAsync(category);
        _categoryRepo.Setup(r => r.ReassignTransactionsAsync("Old", "New", _userId)).ReturnsAsync(5);
        _categoryRepo.Setup(r => r.DeleteAsync(It.IsAny<Category>())).Returns(Task.CompletedTask);

        var result = await _service.DeleteCategoryAsync(categoryId, "New", _userId);

        Assert.Equal(5, result.ReassignedTransactions);
    }

    [Fact]
    public async Task DeleteCategoryAsync_ThrowsNotFoundException_WhenNotOwner()
    {
        var categoryId = Guid.NewGuid();
        var category = new Category("Test", _otherUserId);
        _categoryRepo.Setup(r => r.GetByIdAsync(categoryId)).ReturnsAsync(category);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.DeleteCategoryAsync(categoryId, null, _userId));
    }

    [Fact]
    public async Task ReassignAsync_ReturnsAffectedCount()
    {
        _categoryRepo.Setup(r => r.ReassignTransactionsAsync("From", "To", _userId)).ReturnsAsync(3);

        var result = await _service.ReassignAsync(new ReassignRequest("From", "To"), _userId);

        Assert.Equal(3, result.AffectedTransactions);
    }

    [Fact]
    public async Task ReorderAsync_ReturnsSuccess_WhenAllCategoriesPresent()
    {
        var cat1 = new Category("A", _userId);
        var cat2 = new Category("B", _userId);
        _categoryRepo.Setup(r => r.GetByUserAsync(_userId)).ReturnsAsync(new List<Category> { cat1, cat2 });
        _categoryRepo.Setup(r => r.UpdateAsync(It.IsAny<Category>())).Returns(Task.CompletedTask);

        var ids = new List<string> { cat1.Id.ToString(), cat2.Id.ToString() };
        var result = await _service.ReorderAsync(new ReorderRequest(ids), _userId);

        Assert.True(result.Success);
        _categoryRepo.Verify(r => r.UpdateAsync(It.Is<Category>(c => c.Order == 1)), Times.Once);
        _categoryRepo.Verify(r => r.UpdateAsync(It.Is<Category>(c => c.Order == 2)), Times.Once);
    }

    [Fact]
    public async Task ReorderAsync_ThrowsDomainException_WhenCountMismatch()
    {
        _categoryRepo.Setup(r => r.GetByUserAsync(_userId)).ReturnsAsync(new List<Category> { new("A", _userId) });

        await Assert.ThrowsAsync<DomainException>(() =>
            _service.ReorderAsync(new ReorderRequest(new List<string> { "id1", "id2" }), _userId));
    }
}
