using System.Text.Json;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Domain.Entities;
using ledger12.Domain.Enums;
using ledger12.Domain.Exceptions;

namespace ledger12.Application.Services;

public class ExportService : IExportService
{
    private readonly IExportJobRepository _jobRepo;
    private readonly IBookRepository _bookRepo;
    private readonly ITransactionRepository _transactionRepo;
    private readonly IUserRepository _userRepo;
    private readonly ICategoryRepository _categoryRepo;
    private readonly string _exportDir;

    public ExportService(
        IExportJobRepository jobRepo,
        IBookRepository bookRepo,
        ITransactionRepository transactionRepo,
        IUserRepository userRepo,
        ICategoryRepository categoryRepo,
        string? exportDir = null)
    {
        _jobRepo = jobRepo;
        _bookRepo = bookRepo;
        _transactionRepo = transactionRepo;
        _userRepo = userRepo;
        _categoryRepo = categoryRepo;
        _exportDir = exportDir ?? Path.Combine(Directory.GetCurrentDirectory(), "exports");
        Directory.CreateDirectory(_exportDir);
    }

    public async Task<ExportResponse> CreateExportJobAsync(CreateExportRequest request, Guid userId)
    {
        var format = request.Format?.ToLowerInvariant() switch
        {
            "csv" => ExportFormat.Csv,
            "xlsx" => ExportFormat.Xlsx,
            "json" or _ => ExportFormat.Json,
        };

        var contentType = request.ContentType.ToLowerInvariant() switch
        {
            "categories" => ExportContentType.Categories,
            "transactions" => ExportContentType.Transactions,
            "books" => ExportContentType.Books,
            "report-daily-total" => ExportContentType.ReportDailyTotal,
            "report-daily-per-category" => ExportContentType.ReportDailyPerCategory,
            "report-monthly-total" => ExportContentType.ReportMonthlyTotal,
            "report-monthly-per-category" => ExportContentType.ReportMonthlyPerCategory,
            "report-yearly-total" => ExportContentType.ReportYearlyTotal,
            "report-yearly-per-category" => ExportContentType.ReportYearlyPerCategory,
            "backup" => ExportContentType.Backup,
            _ => throw new DomainException($"Unknown contentType: {request.ContentType}")
        };

        if (contentType == ExportContentType.Backup)
            format = ExportFormat.Json;

        Guid? bookId = null;
        if (request.BookId != null && Guid.TryParse(request.BookId, out var bid))
            bookId = bid;

        var job = new ExportJob(format, contentType, userId, bookId);
        await _jobRepo.AddAsync(job);

        return new ExportResponse(job.Id.ToString(), "pending");
    }

    public async Task<ExportStatusResponse> GetExportStatusAsync(Guid jobId, Guid userId)
    {
        var job = await _jobRepo.GetByIdAsync(jobId);
        if (job == null || job.UserId != userId)
            throw new NotFoundException("Export job", jobId);

        string? downloadUrl = job.Status == ExportJobStatus.Completed
            ? $"/api/v1/exports/{job.Id}/download"
            : null;

        return new ExportStatusResponse(
            job.Id.ToString(),
            job.Status.ToString().ToLowerInvariant(),
            downloadUrl,
            job.ErrorMessage
        );
    }

    public async Task<(byte[] Data, string ContentType, string FileName)> DownloadExportAsync(Guid jobId, Guid userId)
    {
        var job = await _jobRepo.GetByIdAsync(jobId);
        if (job == null || job.UserId != userId)
            throw new NotFoundException("Export job", jobId);

        if (job.Status != ExportJobStatus.Completed || job.FilePath == null || !File.Exists(job.FilePath))
            throw new DomainException("Export is not yet completed");

        var data = await File.ReadAllBytesAsync(job.FilePath);
        var mimeType = job.Format switch
        {
            ExportFormat.Csv => "text/csv",
            ExportFormat.Xlsx => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ExportFormat.Json => "application/json",
            _ => "application/octet-stream"
        };

        var fileName = Path.GetFileName(job.FilePath);
        return (data, mimeType, fileName);
    }

    // Called by background processor
    public async Task ProcessExportAsync(ExportJob job)
    {
        job.SetProcessing();
        await _jobRepo.UpdateAsync(job);

        try
        {
            var dateStr = DateTimeOffset.UtcNow.ToString("yyyy-MM-dd");
            string fileName;
            string content;

            switch (job.ContentType)
            {
                case ExportContentType.Categories:
                    content = await GenerateCategoriesExport(job.UserId, job.Format);
                    fileName = $"categories-{dateStr}.{FormatExtension(job.Format)}";
                    break;
                case ExportContentType.Transactions:
                    content = await GenerateTransactionsExport(job.UserId, job.BookId, job.Format);
                    var bookName = job.BookId.HasValue
                        ? (await _bookRepo.GetByIdAsync(job.BookId.Value))?.Name ?? "Unknown"
                        : "Unknown";
                    fileName = $"transactions-{bookName}-{dateStr}.{FormatExtension(job.Format)}";
                    break;
                case ExportContentType.Books:
                    content = await GenerateBooksExport(job.UserId, job.Format);
                    fileName = $"books-{dateStr}.{FormatExtension(job.Format)}";
                    break;
                case ExportContentType.Backup:
                    content = await GenerateBackupExport(job.UserId);
                    fileName = $"ledger12-backup-{dateStr}.json";
                    break;
                default:
                    content = await GenerateReportExport(job.UserId, job.ContentType, job.Format);
                    fileName = $"{job.ContentType.ToString().ToLowerInvariant()}-{dateStr}.{FormatExtension(job.Format)}";
                    break;
            }

            var filePath = Path.Combine(_exportDir, fileName);
            await File.WriteAllTextAsync(filePath, content);
            job.SetCompleted(filePath);
            await _jobRepo.UpdateAsync(job);
        }
        catch (Exception ex)
        {
            job.SetFailed(ex.Message);
            await _jobRepo.UpdateAsync(job);
        }
    }

    private static string FormatExtension(ExportFormat format) => format switch
    {
        ExportFormat.Csv => "csv",
        ExportFormat.Xlsx => "xlsx",
        ExportFormat.Json => "json",
        _ => "txt"
    };

    private async Task<string> GenerateCategoriesExport(Guid userId, ExportFormat format)
    {
        var categories = await _categoryRepo.GetByUserAsync(userId);
        var list = categories.Select(c => new
        {
            id = c.Id.ToString(),
            name = c.Name,
            recurring = c.Recurring,
            color = c.Color,
            icon = c.Icon,
            order = c.Order
        }).ToList();

        if (format == ExportFormat.Json)
            return JsonSerializer.Serialize(list, new JsonSerializerOptions { WriteIndented = true });

        var csv = "id,name,recurring,color,icon,order\n";
        csv += string.Join("\n", categories.Select(c =>
            $"{c.Id},{EscapeCsv(c.Name)},{c.Recurring},{c.Color},{EscapeCsv(c.Icon)},{c.Order}"));
        return csv;
    }

    private async Task<string> GenerateTransactionsExport(Guid userId, Guid? bookId, ExportFormat format)
    {
        var transactions = await _transactionRepo.SearchAsync(bookId: bookId, page: 1, pageSize: int.MaxValue);

        if (format == ExportFormat.Json)
        {
            var list = transactions.Select(t => new
            {
                id = t.Id.ToString(),
                bookId = t.BookId.ToString(),
                userId = t.UserId.ToString(),
                dateTime = t.DateTime.ToString("o"),
                amount = t.Amount,
                originalCurrency = t.OriginalCurrency,
                originalAmount = t.OriginalAmount,
                exchangeRate = t.ExchangeRate,
                categoryName = t.CategoryName,
                note = t.Note
            });
            return JsonSerializer.Serialize(list, new JsonSerializerOptions { WriteIndented = true });
        }

        var csv = "dateTime,amount,categoryName,note,originalCurrency,originalAmount,exchangeRate\n";
        csv += string.Join("\n", transactions.Select(t =>
            $"{t.DateTime:yyyy-MM-ddTHH:mm:ssZ},{t.Amount},{EscapeCsv(t.CategoryName)},{EscapeCsv(t.Note)},{EscapeCsv(t.OriginalCurrency)},{t.OriginalAmount},{t.ExchangeRate}"));
        return csv;
    }

    private async Task<string> GenerateBooksExport(Guid userId, ExportFormat format)
    {
        var books = await _bookRepo.GetByOwnerAsync(userId);

        if (format == ExportFormat.Json)
        {
            var list = books.Select(b => new
            {
                id = b.Id.ToString(),
                name = b.Name,
                currency = b.Currency,
                status = b.Status.ToString().ToLowerInvariant(),
                ownerId = b.OwnerId.ToString(),
                createdAt = b.CreatedAt.ToString("o")
            });
            return JsonSerializer.Serialize(list, new JsonSerializerOptions { WriteIndented = true });
        }

        var csv = "id,name,currency,status,ownerId,createdAt\n";
        csv += string.Join("\n", books.Select(b =>
            $"{b.Id},{EscapeCsv(b.Name)},{EscapeCsv(b.Currency)},{b.Status.ToString().ToLowerInvariant()},{b.OwnerId},{b.CreatedAt:o}"));
        return csv;
    }

    private async Task<string> GenerateBackupExport(Guid userId)
    {
        var books = await _bookRepo.GetByOwnerAsync(userId);
        var categories = await _categoryRepo.GetByUserAsync(userId);
        var transactions = await _transactionRepo.SearchAsync(page: 1, pageSize: int.MaxValue);

        var backup = new
        {
            exportedAt = DateTimeOffset.UtcNow.ToString("o"),
            version = 1,
            books = books.Select(b => new
            {
                id = b.Id.ToString(),
                name = b.Name,
                currency = b.Currency,
                status = b.Status.ToString().ToLowerInvariant(),
                ownerId = b.OwnerId.ToString(),
                createdAt = b.CreatedAt.ToString("o"),
                closedAt = b.ClosedAt?.ToString("o")
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
                userId = t.UserId.ToString(),
                dateTime = t.DateTime.ToString("o"),
                amount = t.Amount,
                categoryName = t.CategoryName,
                note = t.Note,
                isBookClosingEntry = t.IsBookClosingEntry,
                closedBookId = t.ClosedBookId?.ToString()
            })
        };

        return JsonSerializer.Serialize(backup, new JsonSerializerOptions { WriteIndented = true });
    }

    private async Task<string> GenerateReportExport(Guid userId, ExportContentType contentType, ExportFormat format)
    {
        // Simplified report export - returns JSON
        var reportData = new { message = "Report export - see /api/v1/reports for live data" };
        return JsonSerializer.Serialize(reportData, new JsonSerializerOptions { WriteIndented = true });
    }

    private static string EscapeCsv(string? value) =>
        value == null ? "" : $"\"{value.Replace("\"", "\"\"")}\"";
}
