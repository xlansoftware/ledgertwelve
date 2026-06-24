using ledger12.Domain.Entities;
using ledger12.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ledger12.Infrastructure.Configurations;

public class BookShareConfiguration : IEntityTypeConfiguration<BookShare>
{
    public void Configure(EntityTypeBuilder<BookShare> builder)
    {
        builder.ToTable("BookShares");
        builder.HasKey(s => new { s.BookId, s.UserId });
        builder.Property(s => s.Permission).IsRequired().HasConversion<string>().HasMaxLength(20);

        builder.HasOne(s => s.Book)
            .WithMany(b => b.Shares)
            .HasForeignKey(s => s.BookId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
