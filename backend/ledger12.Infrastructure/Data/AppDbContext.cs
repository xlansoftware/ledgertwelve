using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

using ledger12.Domain;
using Microsoft.EntityFrameworkCore;

namespace ledger12.Infrastructure.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<DailyAggregate> DailyAggregates => Set<DailyAggregate>();
    public DbSet<WeeklyAggregate> WeeklyAggregates => Set<WeeklyAggregate>();
    public DbSet<MonthlyAggregate> MonthlyAggregates => Set<MonthlyAggregate>();
    public DbSet<YearlyAggregate> YearlyAggregates => Set<YearlyAggregate>();

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Transaction>(entity =>
        {
            entity.HasKey(t => t.Id);

            entity.Property(t => t.Value)
                  .HasColumnType("decimal(18,2)")
                  .IsRequired();

            entity.Property(t => t.Currency)
                  .HasMaxLength(10)
                  .IsRequired();

            entity.Property(t => t.Category)
                  .HasMaxLength(100)
                  .IsRequired();

            entity.Property(t => t.Author)
                  .HasMaxLength(200)
                  .IsRequired();

            entity.Property(t => t.Book)
                  .HasMaxLength(100);

            entity.Property(t => t.Date)
                  .IsRequired();
        });

        ConfigureAggregateEntity<DailyAggregate>(builder, "DailyAggregates");
        ConfigureAggregateEntity<WeeklyAggregate>(builder, "WeeklyAggregates");
        ConfigureAggregateEntity<MonthlyAggregate>(builder, "MonthlyAggregates");
        ConfigureAggregateEntity<YearlyAggregate>(builder, "YearlyAggregates");
    }

    private static void ConfigureAggregateEntity<T>(ModelBuilder builder, string tableName)
        where T : class, IAggregateEntity
    {
        builder.Entity<T>(entity =>
        {
            entity.ToTable(tableName);

            entity.HasKey(nameof(IAggregateEntity.PeriodStart), nameof(IAggregateEntity.Book),
                nameof(IAggregateEntity.Author), nameof(IAggregateEntity.Category),
                nameof(IAggregateEntity.Currency));

            entity.Property(nameof(IAggregateEntity.PeriodStart))
                  .IsRequired();

            entity.Property(nameof(IAggregateEntity.Book))
                  .HasMaxLength(100)
                  .IsRequired();

            entity.Property(nameof(IAggregateEntity.Author))
                  .HasMaxLength(200)
                  .IsRequired();

            entity.Property(nameof(IAggregateEntity.Category))
                  .HasMaxLength(100)
                  .IsRequired();

            entity.Property(nameof(IAggregateEntity.Currency))
                  .HasMaxLength(10)
                  .IsRequired();

            entity.Property(nameof(IAggregateEntity.SumValue))
                  .HasColumnType("decimal(18,2)")
                  .IsRequired();

            entity.Property(nameof(IAggregateEntity.TransactionCount))
                  .IsRequired();
        });
    }
}
