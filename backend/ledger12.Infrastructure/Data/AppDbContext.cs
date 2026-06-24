using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using ledger12.Domain.Entities;
using ledger12.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace ledger12.Infrastructure.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<BookShare> BookShares => Set<BookShare>();
    public DbSet<GlobalShare> GlobalShares => Set<GlobalShare>();
    public DbSet<UserPreference> UserPreferences => Set<UserPreference>();
    public DbSet<ExportJob> ExportJobs => Set<ExportJob>();
    public DbSet<CurrencyRate> CurrencyRates => Set<CurrencyRate>();

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // SQLite does not support DateTimeOffset comparisons (ORDER BY, WHERE, GROUP BY).
        // Convert DateTimeOffset to DateTime (UTC) for storage, since all values use DateTimeOffset.UtcNow.
        var dateTimeOffsetConverter = new ValueConverter<DateTimeOffset, DateTime>(
            v => v.UtcDateTime,
            v => new DateTimeOffset(v, TimeSpan.Zero));

        var nullableDateTimeOffsetConverter = new ValueConverter<DateTimeOffset?, DateTime?>(
            v => v.HasValue ? v.Value.UtcDateTime : null,
            v => v.HasValue ? new DateTimeOffset(v.Value, TimeSpan.Zero) : null);

        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTimeOffset))
                {
                    property.SetValueConverter(dateTimeOffsetConverter);
                }
                else if (property.ClrType == typeof(DateTimeOffset?))
                {
                    property.SetValueConverter(nullableDateTimeOffsetConverter);
                }
            }
        }
    }
}
