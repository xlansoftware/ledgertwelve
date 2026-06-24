using ledger12.Domain.Entities;
using ledger12.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ledger12.Infrastructure.Configurations;

public class ExportJobConfiguration : IEntityTypeConfiguration<ExportJob>
{
    public void Configure(EntityTypeBuilder<ExportJob> builder)
    {
        builder.ToTable("ExportJobs");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Status).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(e => e.Format).IsRequired().HasConversion<string>().HasMaxLength(10);
        builder.Property(e => e.ContentType).IsRequired().HasConversion<string>().HasMaxLength(50);
        builder.Property(e => e.UserId).IsRequired();
        builder.Property(e => e.FilePath).HasMaxLength(1000);
        builder.Property(e => e.ErrorMessage).HasMaxLength(2000);
        builder.Property(e => e.CreatedAt).IsRequired();
    }
}
