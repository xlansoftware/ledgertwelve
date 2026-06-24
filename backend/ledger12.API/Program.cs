using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Channels;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ledger12.API.Middleware;
using ledger12.Application.Interfaces;
using ledger12.Application.Services;
using ledger12.Infrastructure.Data;
using ledger12.Infrastructure.Repositories;
using ledger12.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("AppDbContextConnection") ?? throw new InvalidOperationException("Connection string 'AppDbContextConnection' not found.");

// ─── Database ───────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));

// ─── Identity (Cookie Auth) ─────────────────────────────────────────
builder.Services.AddIdentity<AppUser, IdentityRole>(options =>
    {
        options.SignIn.RequireConfirmedAccount = false;
    })
    .AddEntityFrameworkStores<AppDbContext>();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.Name = "ledger12.session";
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.LoginPath = "/api/v1/auth/login";
    options.SlidingExpiration = true;
});

// ─── HTTP context ───────────────────────────────────────────────────
builder.Services.AddHttpContextAccessor();

// ─── Repositories ───────────────────────────────────────────────────
builder.Services.AddScoped<IBookRepository, BookRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<ITransactionRepository, TransactionRepository>();
builder.Services.AddScoped<IExportJobRepository, ExportJobRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();

// ─── Application Services ───────────────────────────────────────────
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IBookService, BookService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<ITransactionService, TransactionService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IImportService, ImportService>();
builder.Services.AddScoped<IExportService, ExportService>();

// ─── Exchange Rate HttpClient ───────────────────────────────────────
builder.Services.AddHttpClient<IExchangeRateService, ExchangeRateService>();

// ─── Export Background Processing ───────────────────────────────────
builder.Services.AddSingleton(Channel.CreateUnbounded<Guid>());
builder.Services.AddHostedService<ExportJobProcessor>();

// ─── FluentValidation ───────────────────────────────────────────────
builder.Services.AddFluentValidationAutoValidation(config =>
{
    config.DisableDataAnnotationsValidation = true;
});
builder.Services.AddValidatorsFromAssemblyContaining<ledger12.Application.Validators.LoginRequestValidator>();

// ─── Controllers + JSON ─────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// ─── CORS (development) ─────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// ─── Middleware pipeline ────────────────────────────────────────────
app.UseMiddleware<ExceptionMiddleware>();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ─── Auto-migrate + seed ────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var sp = scope.ServiceProvider;
    var db = sp.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    await DbInitializer.SeedAsync(sp);
}

app.Run();
