using ledger12.Domain.Entities;

namespace ledger12.Tests.Unit.Domain;

public class CategoryTests
{
    private readonly Guid _userId = Guid.NewGuid();

    [Fact]
    public void Constructor_SetsProperties_WhenValidArguments()
    {
        var category = new Category("Groceries", _userId, "#ff0000", "shopping-cart", 2, true);

        Assert.NotEqual(Guid.Empty, category.Id);
        Assert.Equal("Groceries", category.Name);
        Assert.Equal(_userId, category.UserId);
        Assert.Equal("#ff0000", category.Color);
        Assert.Equal("shopping-cart", category.Icon);
        Assert.Equal(2, category.Order);
        Assert.True(category.Recurring);
    }

    [Fact]
    public void Constructor_SetsDefaults_WhenOptionalFieldsNotProvided()
    {
        var category = new Category("Default", _userId);

        Assert.Equal("Default", category.Name);
        Assert.Equal(_userId, category.UserId);
        Assert.Null(category.Color);
        Assert.Null(category.Icon);
        Assert.Equal(0, category.Order);
        Assert.False(category.Recurring);
    }

    [Fact]
    public void Update_ChangesNameAndOptionalFields()
    {
        var category = new Category("Old", _userId, "#000", "icon-old", 1, false);

        category.Update("New", true, "#fff", "icon-new");

        Assert.Equal("New", category.Name);
        Assert.True(category.Recurring);
        Assert.Equal("#fff", category.Color);
        Assert.Equal("icon-new", category.Icon);
    }

    [Fact]
    public void Update_DoesNotChangeRecurring_WhenRecurringIsNull()
    {
        var category = new Category("Test", _userId, null, null, 0, true);

        category.Update("Updated", null, "#000", null);

        Assert.True(category.Recurring);
    }

    [Fact]
    public void Update_ClearsColorAndIcon_WhenNullProvided()
    {
        var category = new Category("Test", _userId, "#fff", "icon", 0, false);

        category.Update("Updated", false, null, null);

        Assert.Null(category.Color);
        Assert.Null(category.Icon);
    }

    [Fact]
    public void SetOrder_SetsOrder()
    {
        var category = new Category("Test", _userId);

        category.SetOrder(5);

        Assert.Equal(5, category.Order);
    }
}
