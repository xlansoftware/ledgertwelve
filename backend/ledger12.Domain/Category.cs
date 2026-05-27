namespace ledger12.Domain;

public class Category
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = null!;
    public string? Color { get; private set; }
    public int? DisplayOrder { get; private set; }
    public string? Icon { get; private set; }

    private Category() { } // EF Core

    public Category(string name, string? color = null, int? displayOrder = null, string? icon = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        Id = Guid.NewGuid();
        Name = name.Trim();
        Color = color;
        DisplayOrder = displayOrder;
        Icon = icon;
    }

    public void Update(string name, string? color, int? displayOrder, string? icon)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        Name = name.Trim();
        Color = color;
        DisplayOrder = displayOrder;
        Icon = icon;
    }
}
