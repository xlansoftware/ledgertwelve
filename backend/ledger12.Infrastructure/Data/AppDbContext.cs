using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

using ledger12.Domain;
using Microsoft.EntityFrameworkCore;

namespace ledger12.Infrastructure.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public DbSet<Transaction> Transactions => Set<Transaction>();

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
    }
}
