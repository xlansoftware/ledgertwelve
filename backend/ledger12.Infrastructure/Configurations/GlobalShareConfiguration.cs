using ledger12.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ledger12.Infrastructure.Configurations;

public class GlobalShareConfiguration : IEntityTypeConfiguration<GlobalShare>
{
    public void Configure(EntityTypeBuilder<GlobalShare> builder)
    {
        builder.ToTable("GlobalShares");
        builder.HasKey(s => new { s.OwnerId, s.SharedWithUserId });
        builder.Property(s => s.CreatedAt).IsRequired();
    }
}
