using ledger12.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ledger12.Infrastructure.Configurations;

public class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ToTable("Transactions");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.BookId).IsRequired();
        builder.Property(t => t.UserId).IsRequired();
        builder.Property(t => t.Amount).IsRequired().HasColumnType("decimal(18,2)");
        builder.Property(t => t.OriginalCurrency).HasMaxLength(10);
        builder.Property(t => t.OriginalAmount).HasColumnType("decimal(18,2)");
        builder.Property(t => t.ExchangeRate).HasColumnType("decimal(18,6)");
        builder.Property(t => t.CategoryName).HasMaxLength(200);
        builder.Property(t => t.Note).HasMaxLength(2000);
        builder.Property(t => t.CreatedAt).IsRequired();
        builder.Property(t => t.ClosedBookId);

        builder.HasOne(t => t.Book)
            .WithMany()
            .HasForeignKey(t => t.BookId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(t => t.BookId);
        builder.HasIndex(t => t.UserId);
        builder.HasIndex(t => t.DateTime);
        builder.HasIndex(t => t.CategoryName);
    }
}
