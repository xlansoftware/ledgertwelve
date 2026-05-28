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
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Book> Books => Set<Book>();

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

            entity.Property(t => t.Category)
                  .HasMaxLength(100)
                  .IsRequired();

            entity.Property(t => t.Author)
                  .HasMaxLength(200)
                  .IsRequired();

            entity.Property(t => t.Book)
                  .HasMaxLength(100);

            entity.Property(t => t.Notes)
                  .HasMaxLength(1000);

            entity.Property(t => t.Date)
                  .IsRequired();
        });

        ConfigureAggregateEntity<DailyAggregate>(builder, "DailyAggregates");
        ConfigureAggregateEntity<WeeklyAggregate>(builder, "WeeklyAggregates");
        ConfigureAggregateEntity<MonthlyAggregate>(builder, "MonthlyAggregates");
        ConfigureAggregateEntity<YearlyAggregate>(builder, "YearlyAggregates");

        builder.Entity<Category>(entity =>
        {
            entity.HasKey(c => c.Id);

            entity.Property(c => c.Name)
                  .HasMaxLength(100)
                  .IsRequired();

            entity.Property(c => c.Color)
                  .HasMaxLength(7);

            entity.Property(c => c.DisplayOrder);

            entity.Property(c => c.Icon)
                  .HasMaxLength(100);

            entity.HasIndex(c => c.Name)
                  .IsUnique();
        });

        builder.Entity<Book>(entity =>
        {
            entity.HasKey(b => b.Id);

            entity.Property(b => b.Name)
                  .HasMaxLength(100)
                  .IsRequired();

            entity.Property(b => b.Currency)
                  .HasMaxLength(10)
                  .IsRequired();

            entity.Property(b => b.Color)
                  .HasMaxLength(7);

            entity.Property(b => b.Status)
                  .HasMaxLength(50);

            entity.HasIndex(b => b.Name)
                  .IsUnique();
        });
    }

    private static void ConfigureAggregateEntity<T>(ModelBuilder builder, string tableName)
        where T : class, IAggregateEntity
    {
        builder.Entity<T>(entity =>
        {
            entity.ToTable(tableName);

            entity.HasKey(nameof(IAggregateEntity.PeriodStart), nameof(IAggregateEntity.Book),
                nameof(IAggregateEntity.Author), nameof(IAggregateEntity.Category));

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

            entity.Property(nameof(IAggregateEntity.SumValue))
                  .HasColumnType("decimal(18,2)")
                  .IsRequired();

            entity.Property(nameof(IAggregateEntity.TransactionCount))
                  .IsRequired();
        });
    }
}
