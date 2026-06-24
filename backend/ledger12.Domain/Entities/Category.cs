namespace ledger12.Domain.Entities;

public class Category
{
    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public bool Recurring { get; private set; }
    public string? Color { get; private set; }
    public string? Icon { get; private set; }
    public int Order { get; private set; }
    public Guid UserId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private Category() { }

    public Category(string name, Guid userId, string? color = null, string? icon = null, int order = 0, bool recurring = false)
    {
        Id = Guid.NewGuid();
        Name = name;
        UserId = userId;
        Color = color;
        Icon = icon;
        Order = order;
        Recurring = recurring;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public void Update(string name, bool? recurring, string? color, string? icon)
    {
        Name = name;
        if (recurring.HasValue) Recurring = recurring.Value;
        Color = color;
        Icon = icon;
    }

    public void SetOrder(int order)
    {
        Order = order;
    }
}
