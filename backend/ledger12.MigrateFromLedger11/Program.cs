using System.Text.Json;
using ledger12.Infrastructure.Data;
using ledger12.MigrateFromLedger11;
using Microsoft.EntityFrameworkCore;

// ─── Parse CLI arguments ───────────────────────────────────────────
// Usage: dotnet run --project ledger12.MigrateFromLedger11 [--connection-string "..." ] [--data-dir "./ledger11data"]

string? connectionString = null;
var dataDir = "./ledger11data";

for (int i = 0; i < args.Length; i++)
{
    if (args[i] == "--connection-string" && i + 1 < args.Length)
        connectionString = args[++i];
    else if (args[i] == "--data-dir" && i + 1 < args.Length)
        dataDir = args[++i];
    else if (args[i] == "--help" || args[i] == "-h")
    {
        Console.WriteLine("Usage: ledger12.MigrateFromLedger11 [options]");
        Console.WriteLine("  --connection-string <cs>  SQLite connection string (default: reads from appsettings.json)");
        Console.WriteLine("  --data-dir <path>         Path to ledger11data directory (default: ./ledger11data)");
        return;
    }
}

// Resolve data directory relative to the working directory
var resolvedDataDir = Path.GetFullPath(dataDir);
Console.WriteLine($"Data directory: {resolvedDataDir}");

if (!Directory.Exists(resolvedDataDir))
{
    Console.Error.WriteLine($"Error: Data directory not found: {resolvedDataDir}");
    Environment.Exit(1);
}

if (!File.Exists(Path.Combine(resolvedDataDir, "appdata.db")))
{
    Console.Error.WriteLine($"Error: appdata.db not found in {resolvedDataDir}");
    return;
}

// ─── Resolve connection string ─────────────────────────────────────
if (connectionString is null)
{
    // Try to read from API project's appsettings.json
    var apiSettingsPath = FindApiAppSettings();
    if (apiSettingsPath is not null)
    {
        try
        {
            var json = File.ReadAllText(apiSettingsPath);
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("ConnectionStrings", out var csElement) &&
                csElement.TryGetProperty("AppDbContextConnection", out var connElement))
            {
                connectionString = connElement.GetString();
                Console.WriteLine($"Using connection string from {apiSettingsPath}");
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Warning: Could not read appsettings: {ex.Message}");
        }
    }

    // Try environment variable (Docker convention)
    connectionString ??= Environment.GetEnvironmentVariable("ConnectionStrings__AppDbContextConnection");

    if (connectionString is not null)
        Console.WriteLine("Using connection string from environment variable.");

    if (connectionString is null)
    {
        connectionString = "Data Source=./data/ledger12.API.db";
        Console.WriteLine($"Using default connection string: {connectionString}");
    }
}

Console.WriteLine($"Connection string: {connectionString}");

// ─── Database setup ───────────────────────────────────────────────
Console.WriteLine("\nSetting up database...");

var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
optionsBuilder.UseSqlite(connectionString);

using var db = new AppDbContext(optionsBuilder.Options);

// Drop and recreate the database to ensure a clean start
Console.WriteLine("Dropping existing database...");
await db.Database.EnsureDeletedAsync();

Console.WriteLine("Applying migrations...");
await db.Database.MigrateAsync();

// ─── Run migration ────────────────────────────────────────────────
Console.WriteLine("\nStarting migration from Ledger11...\n");

var engine = new MigrationEngine(resolvedDataDir, db);
var summary = await engine.RunAsync();

summary.Print();

// ─── Local helpers ───────────────────────────────────────────

static string? FindApiAppSettings()
{
    // Try relative paths from the working directory
    var candidates = new[]
    {
        Path.Combine("ledger12.API", "appsettings.json"),
        Path.Combine("..", "ledger12.API", "appsettings.json"),
        Path.Combine("..", "..", "ledger12.API", "appsettings.json"),
        "appsettings.json",
    };

    foreach (var candidate in candidates)
    {
        var fullPath = Path.GetFullPath(candidate);
        if (File.Exists(fullPath))
            return fullPath;
    }

    return null;
}
