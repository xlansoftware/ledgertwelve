using System.Threading.Channels;
using ledger12.Application.Interfaces;
using ledger12.Application.Services;
using ledger12.Domain.Entities;
using ledger12.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ledger12.Infrastructure.Services;

public class ExportJobProcessor : BackgroundService
{
    private readonly Channel<Guid> _channel;
    private readonly IServiceScopeFactory _scopeFactory;

    public ExportJobProcessor(Channel<Guid> channel, IServiceScopeFactory scopeFactory)
    {
        _channel = channel;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var jobId in _channel.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var job = await context.ExportJobs.FindAsync(new object[] { jobId }, stoppingToken);
                if (job == null) continue;

                job.SetProcessing();
                await context.SaveChangesAsync(stoppingToken);

                var exportService = new InfrastructureExportService(context);
                await exportService.ProcessExportAsync(job, scope.ServiceProvider, stoppingToken);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Export processing error: {ex.Message}");
            }
        }
    }
}

/// <summary>
/// Internal export processing that has access to DbContext directly for efficient data access.
/// </summary>
internal class InfrastructureExportService
{
    private readonly AppDbContext _context;

    public InfrastructureExportService(AppDbContext context)
    {
        _context = context;
    }

    public async Task ProcessExportAsync(Domain.Entities.ExportJob job, IServiceProvider services, CancellationToken ct)
    {
        try
        {
            var exportDir = Path.Combine(Directory.GetCurrentDirectory(), "exports");
            Directory.CreateDirectory(exportDir);
            var dateStr = DateTimeOffset.UtcNow.ToString("yyyy-MM-dd");

            string content;
            string fileName;

            switch (job.ContentType)
            {
                case Domain.Enums.ExportContentType.Categories:
                    content = await ExportCategoriesAsync(job.UserId, job.Format);
                    fileName = $"categories-{dateStr}.{FormatExt(job.Format)}";
                    break;
                case Domain.Enums.ExportContentType.Transactions:
                    var bookName = "Unknown";
                    if (job.BookId.HasValue)
                    {
                        var book = await _context.Books.FindAsync(new object[] { job.BookId.Value }, ct);
                        if (book != null) bookName = book.Name;
                    }
                    content = await ExportTransactionsAsync(job.BookId, job.Format);
                    fileName = $"transactions-{bookName}-{dateStr}.{FormatExt(job.Format)}";
                    break;
                case Domain.Enums.ExportContentType.Books:
                    content = await ExportBooksAsync(job.UserId, job.Format);
                    fileName = $"books-{dateStr}.{FormatExt(job.Format)}";
                    break;
                case Domain.Enums.ExportContentType.Backup:
                    content = await ExportBackupAsync(job.UserId);
                    fileName = $"ledger12-backup-{dateStr}.json";
                    break;
                default:
                    content = System.Text.Json.JsonSerializer.Serialize(new { message = "Report export" });
                    fileName = $"{job.ContentType.ToString().ToLowerInvariant()}-{dateStr}.{FormatExt(job.Format)}";
                    break;
            }

            var filePath = Path.Combine(exportDir, fileName);
            await File.WriteAllTextAsync(filePath, content, ct);

            job.SetCompleted(filePath);
            await _context.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            job.SetFailed(ex.Message);
            await _context.SaveChangesAsync(ct);
        }
    }

    private static string FormatExt(Domain.Enums.ExportFormat format) => format switch
    {
        Domain.Enums.ExportFormat.Csv => "csv",
        Domain.Enums.ExportFormat.Xlsx => "xlsx",
        Domain.Enums.ExportFormat.Json => "json",
        _ => "txt"
    };

    private async Task<string> ExportCategoriesAsync(Guid userId, Domain.Enums.ExportFormat format)
    {
        var categories = await _context.Categories.Where(c => c.UserId == userId).OrderBy(c => c.Order).ToListAsync();

        if (format == Domain.Enums.ExportFormat.Json)
        {
            var list = categories.Select(c => new
            {
                id = c.Id.ToString(),
                name = c.Name,
                recurring = c.Recurring,
                color = c.Color,
                icon = c.Icon,
                order = c.Order
            });
            return System.Text.Json.JsonSerializer.Serialize(list, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
        }

        var csv = "id,name,recurring,color,icon,order\n";
        csv += string.Join("\n", categories.Select(c =>
            $"{c.Id},{EscapeCsv(c.Name)},{c.Recurring},{EscapeCsv(c.Color)},{EscapeCsv(c.Icon)},{c.Order}"));
        return csv;
    }

    private async Task<string> ExportTransactionsAsync(Guid? bookId, Domain.Enums.ExportFormat format)
    {
        var query = _context.Transactions.AsQueryable();
        if (bookId.HasValue) query = query.Where(t => t.BookId == bookId.Value);
        var transactions = await query.OrderByDescending(t => t.DateTime).ToListAsync();

        if (format == Domain.Enums.ExportFormat.Json)
        {
            var list = transactions.Select(t => new
            {
                id = t.Id.ToString(),
                bookId = t.BookId.ToString(),
                userId = t.UserId.ToString(),
                dateTime = t.DateTime.ToString("o"),
                amount = t.Amount,
                categoryName = t.CategoryName,
                note = t.Note
            });
            return System.Text.Json.JsonSerializer.Serialize(list, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
        }

        var csv = "dateTime,amount,categoryName,note\n";
        csv += string.Join("\n", transactions.Select(t =>
            $"{t.DateTime:yyyy-MM-ddTHH:mm:ssZ},{t.Amount},{EscapeCsv(t.CategoryName)},{EscapeCsv(t.Note)}"));
        return csv;
    }

    private async Task<string> ExportBooksAsync(Guid userId, Domain.Enums.ExportFormat format)
    {
        var books = await _context.Books.Where(b => b.OwnerId == userId).ToListAsync();

        if (format == Domain.Enums.ExportFormat.Json)
        {
            var list = books.Select(b => new
            {
                id = b.Id.ToString(),
                name = b.Name,
                currency = b.Currency,
                status = b.Status.ToString().ToLowerInvariant()
            });
            return System.Text.Json.JsonSerializer.Serialize(list, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
        }

        var csv = "id,name,currency,status\n";
        csv += string.Join("\n", books.Select(b =>
            $"{b.Id},{EscapeCsv(b.Name)},{EscapeCsv(b.Currency)},{b.Status.ToString().ToLowerInvariant()}"));
        return csv;
    }

    private async Task<string> ExportBackupAsync(Guid userId)
    {
        var books = await _context.Books.Where(b => b.OwnerId == userId).ToListAsync();
        var categories = await _context.Categories.Where(c => c.UserId == userId).ToListAsync();
        var transactions = await _context.Transactions
            .Where(t => _context.Books.Any(b => b.Id == t.BookId && b.OwnerId == userId))
            .ToListAsync();

        var backup = new
        {
            exportedAt = DateTimeOffset.UtcNow.ToString("o"),
            version = 1,
            books = books.Select(b => new
            {
                id = b.Id.ToString(),
                name = b.Name,
                currency = b.Currency,
                status = b.Status.ToString().ToLowerInvariant()
            }),
            categories = categories.Select(c => new
            {
                id = c.Id.ToString(),
                name = c.Name,
                recurring = c.Recurring,
                color = c.Color,
                icon = c.Icon,
                order = c.Order
            }),
            transactions = transactions.Select(t => new
            {
                id = t.Id.ToString(),
                bookId = t.BookId.ToString(),
                dateTime = t.DateTime.ToString("o"),
                amount = t.Amount,
                categoryName = t.CategoryName,
                note = t.Note
            })
        };

        return System.Text.Json.JsonSerializer.Serialize(backup, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
    }

    private static string EscapeCsv(string? value) =>
        value == null ? "" : $"\"{value.Replace("\"", "\"\"")}\"";
}
