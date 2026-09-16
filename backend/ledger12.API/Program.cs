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
using Microsoft.AspNetCore.DataProtection;

var builder = WebApplication.CreateBuilder(args);
var isDevelopment = builder.Environment.IsDevelopment();

var connectionString = builder.Configuration.GetConnectionString("AppDbContextConnection") ?? throw new InvalidOperationException("Connection string 'AppDbContextConnection' not found.");

// ─── Database ───────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));

// ─── Data Protection (persist keys to volume so cookies survive restarts) ─
if (builder.Environment.IsProduction())
{
    builder.Services.AddDataProtection()
        .PersistKeysToFileSystem(new DirectoryInfo("/data/keys"));
}

// ─── Identity (Cookie Auth) ─────────────────────────────────────────
builder.Services.AddIdentity<AppUser, IdentityRole>(options =>
    {
        options.SignIn.RequireConfirmedAccount = false;
        options.Lockout.AllowedForNewUsers = true;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    })
    .AddEntityFrameworkStores<AppDbContext>();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    // Development still runs over plain HTTP, so only pin the cookie to HTTPS
    // once the app is deployed behind TLS.
    options.Cookie.SecurePolicy = isDevelopment
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.LoginPath = "/login";
    options.SlidingExpiration = true;
    options.Cookie.MaxAge = TimeSpan.FromDays(7);
});

// ─── Transport security ─────────────────────────────────────────────
// TLS is terminated by the reverse proxy (Cloudflare -> nginx). Requests that
// still arrive over HTTP are redirected, and HSTS is advertised, once deployed.
builder.Services.AddHttpsRedirection(options => options.HttpsPort = 443);

// Outside Development the app must never accept an arbitrary Host header.
if (!isDevelopment)
{
    var allowedHosts = builder.Configuration["AllowedHosts"];
    if (string.IsNullOrWhiteSpace(allowedHosts) || allowedHosts.Trim() == "*")
    {
        throw new InvalidOperationException(
            "AllowedHosts must be a restricted, semicolon-separated host list outside Development.");
    }
}

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
builder.Services.AddScoped<IDefaultDataService, DefaultDataService>();

// ─── Login rate limiting ────────────────────────────────────────────
builder.Services.Configure<LoginRateLimitOptions>(
    builder.Configuration.GetSection(LoginRateLimitOptions.SectionName));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<ILoginRateLimiter, LoginRateLimiter>();

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

// ─── CORS ───────────────────────────────────────────────────────────
// Development stays permissive so a local dev server on any port can call the
// API. Everywhere else only explicitly configured origins may call cross-origin.
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>()
    ?.Where(origin => !string.IsNullOrWhiteSpace(origin))
    .ToArray() ?? [];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (isDevelopment)
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

var app = builder.Build();

app.UseDefaultForwardedHeaders();

// ─── Transport security middleware ──────────────────────────────────
if (!isDevelopment)
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

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
    await DbInitializer.SeedAsync(sp, app.Environment.IsDevelopment());
}

app.Run();
