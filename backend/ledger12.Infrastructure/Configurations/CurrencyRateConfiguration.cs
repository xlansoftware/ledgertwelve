using ledger12.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ledger12.Infrastructure.Configurations;

public class CurrencyRateConfiguration : IEntityTypeConfiguration<CurrencyRate>
{
    public void Configure(EntityTypeBuilder<CurrencyRate> builder)
    {
        builder.ToTable("CurrencyRates");
        builder.HasKey(r => new { r.FromCurrency, r.ToCurrency });
        builder.Property(r => r.FromCurrency).IsRequired().HasMaxLength(10);
        builder.Property(r => r.ToCurrency).IsRequired().HasMaxLength(10);
        builder.Property(r => r.Rate).IsRequired().HasColumnType("decimal(18,6)");
        builder.Property(r => r.UpdatedAt).IsRequired();
    }
}
