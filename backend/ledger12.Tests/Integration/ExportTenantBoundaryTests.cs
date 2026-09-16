using Microsoft.EntityFrameworkCore;
using ledger12.Application.Services;
using ledger12.Domain.Entities;
using ledger12.Domain.Enums;
using ledger12.Infrastructure.Data;
using ledger12.Infrastructure.Repositories;

namespace ledger12.Tests.Integration;

public class ExportTenantBoundaryTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly ExportService _service;
    private readonly Guid _userA = Guid.NewGuid();
    private readonly Guid _userB = Guid.NewGuid();
    private readonly Book _bookA;
    private readonly Book _bookB;
    private readonly string _exportDir;

    public ExportTenantBoundaryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"ExportTenantBoundaryTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new AppDbContext(options);
        _exportDir = Path.Combine(Path.GetTempPath(), "ledger12-export-integration", Guid.NewGuid().ToString());

        _bookA = new Book("A Main", _userA);
        _bookB = new Book("B Main", _userB);

        _context.Books.AddRange(_bookA, _bookB);
        _context.Transactions.AddRange(
            new Transaction(_bookA.Id, _userA, DateTimeOffset.UtcNow, 100m, categoryName: "Food", note: "alpha-transaction"),
            new Transaction(_bookB.Id, _userB, DateTimeOffset.UtcNow, 999m, categoryName: "Salary", note: "beta-transaction"));
        _context.SaveChanges();

        _service = new ExportService(
            new ExportJobRepository(_context),
            new BookRepository(_context),
            new TransactionRepository(_context),
            new UserRepository(_context),
            new CategoryRepository(_context),
            _exportDir);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
        try { Directory.Delete(_exportDir, true); } catch { }
    }

    [Fact]
    public async Task ProcessExportAsync_ContainsOnlyRequestedBooksTransactions()
    {
        var job = new ExportJob(ExportFormat.Csv, ExportContentType.Transactions, _userA, _bookA.Id);
        _context.ExportJobs.Add(job);
        await _context.SaveChangesAsync();

        await _service.ProcessExportAsync(job);

        Assert.Equal(ExportJobStatus.Completed, job.Status);
        Assert.NotNull(job.FilePath);
        var content = await File.ReadAllTextAsync(job.FilePath!);
        Assert.Contains("alpha-transaction", content);
        Assert.DoesNotContain("beta-transaction", content);
    }

    [Fact]
    public async Task ProcessExportAsync_FailsWithoutWritingFile_WhenBookIsNotVisible()
    {
        var job = new ExportJob(ExportFormat.Csv, ExportContentType.Transactions, _userA, _bookB.Id);
        _context.ExportJobs.Add(job);
        await _context.SaveChangesAsync();

        await _service.ProcessExportAsync(job);

        Assert.Equal(ExportJobStatus.Failed, job.Status);
        Assert.Null(job.FilePath);
        Assert.Empty(Directory.GetFiles(_exportDir));
    }

    [Fact]
    public async Task ProcessExportAsync_KeepsFileInsideExportDirectory_WhenBookNameHasPathTraversal()
    {
        var book = Book.Restore(Guid.NewGuid(), "../../outside", _userA, null, BookStatus.Open);
        _context.Books.Add(book);
        _context.Transactions.Add(new Transaction(book.Id, _userA, DateTimeOffset.UtcNow, 1m, note: "traversal"));
        await _context.SaveChangesAsync();

        var job = new ExportJob(ExportFormat.Csv, ExportContentType.Transactions, _userA, book.Id);
        _context.ExportJobs.Add(job);
        await _context.SaveChangesAsync();

        await _service.ProcessExportAsync(job);

        Assert.Equal(ExportJobStatus.Completed, job.Status);
        Assert.NotNull(job.FilePath);

        var exportRoot = Path.GetFullPath(_exportDir) + Path.DirectorySeparatorChar;
        Assert.StartsWith(exportRoot, Path.GetFullPath(job.FilePath!), StringComparison.Ordinal);
        Assert.True(File.Exists(job.FilePath!));
    }
}
