using ledger12.Application.Mappings;
using ledger12.Domain.Entities;

namespace ledger12.Tests.Unit.Application;

public class CategoryMappingsTests
{
    [Fact]
    public void ToDto_MapsAllProperties()
    {
        var createdAt = new DateTimeOffset(2025, 6, 1, 12, 0, 0, TimeSpan.Zero);
        var category = new Category("Groceries", Guid.NewGuid(), "#ff0000", "cart", 3, true);

        var dto = category.ToDto();

        Assert.Equal(category.Id.ToString(), dto.Id);
        Assert.Equal("Groceries", dto.Name);
        Assert.True(dto.Recurring);
        Assert.Equal("#ff0000", dto.Color);
        Assert.Equal("cart", dto.Icon);
        Assert.Equal(3, dto.Order);
        Assert.Equal(category.CreatedAt.ToString("o"), dto.CreatedAt);
    }

    [Fact]
    public void ToDto_MapsOptionalFieldsAsNull()
    {
        var category = new Category("Default", Guid.NewGuid());
        // Use reflection to set CreatedAt to a specific value
        typeof(Category).GetProperty(nameof(Category.CreatedAt))!
            .SetValue(category, new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));

        var dto = category.ToDto();

        Assert.Null(dto.Color);
        Assert.Null(dto.Icon);
        Assert.Equal(0, dto.Order);
        Assert.False(dto.Recurring);
    }
}
