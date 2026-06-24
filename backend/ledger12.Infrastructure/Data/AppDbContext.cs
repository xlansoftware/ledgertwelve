using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using ledger12.Domain.Entities;
using ledger12.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

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
    }
}
