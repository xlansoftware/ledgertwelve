using ledger12.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ledger12.Infrastructure.Configurations;

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("Categories");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Name).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Color).HasMaxLength(20);
        builder.Property(c => c.Icon).HasMaxLength(100);
        builder.Property(c => c.UserId).IsRequired();
        builder.Property(c => c.CreatedAt).IsRequired();
        builder.Property(c => c.Order).HasDefaultValue(0);

        builder.HasIndex(c => new { c.UserId, c.Name }).IsUnique();
        builder.HasIndex(c => c.UserId);
    }
}
