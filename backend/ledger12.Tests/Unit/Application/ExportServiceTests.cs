using Moq;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Application.Services;
using ledger12.Domain.Entities;
using ledger12.Domain.Enums;
using ledger12.Domain.Exceptions;

namespace ledger12.Tests.Unit.Application;

public class ExportServiceTests
{
    private readonly Mock<IExportJobRepository> _jobRepo;
    private readonly Mock<IBookRepository> _bookRepo;
    private readonly Mock<ITransactionRepository> _transactionRepo;
    private readonly Mock<IUserRepository> _userRepo;
    private readonly Mock<ICategoryRepository> _categoryRepo;
    private readonly ExportService _service;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly string _testExportDir;

    public ExportServiceTests()
    {
        _jobRepo = new Mock<IExportJobRepository>();
        _bookRepo = new Mock<IBookRepository>();
        _transactionRepo = new Mock<ITransactionRepository>();
        _userRepo = new Mock<IUserRepository>();
        _categoryRepo = new Mock<ICategoryRepository>();
        _testExportDir = Path.Combine(Path.GetTempPath(), "ledger12-export-tests", Guid.NewGuid().ToString());

        _service = new ExportService(
            _jobRepo.Object, _bookRepo.Object, _transactionRepo.Object,
            _userRepo.Object, _categoryRepo.Object, _testExportDir);
    }

    [Fact]
    public async Task CreateExportJobAsync_ReturnsResponse_WhenValidRequest()
    {
        _jobRepo.Setup(r => r.AddAsync(It.IsAny<ExportJob>())).Returns(Task.CompletedTask);

        var request = new CreateExportRequest("csv", "transactions", Guid.NewGuid().ToString());
        var result = await _service.CreateExportJobAsync(request, _userId);

        Assert.NotNull(result.JobId);
        Assert.Equal("pending", result.Status);
        _jobRepo.Verify(r => r.AddAsync(It.IsAny<ExportJob>()), Times.Once);
    }

    [Fact]
    public async Task CreateExportJobAsync_ThrowsDomainException_WhenTransactionExportMissingBookId()
    {
        var request = new CreateExportRequest("csv", "transactions", null);

        await Assert.ThrowsAsync<DomainException>(() => _service.CreateExportJobAsync(request, _userId));
        _jobRepo.Verify(r => r.AddAsync(It.IsAny<ExportJob>()), Times.Never);
    }

    [Fact]
    public async Task CreateExportJobAsync_ThrowsDomainException_WhenTransactionExportBookIdIsInvalid()
    {
        var request = new CreateExportRequest("csv", "transactions", "not-a-guid");

        await Assert.ThrowsAsync<DomainException>(() => _service.CreateExportJobAsync(request, _userId));
        _jobRepo.Verify(r => r.AddAsync(It.IsAny<ExportJob>()), Times.Never);
    }

    [Fact]
    public async Task CreateExportJobAsync_DefaultsToJson_WhenUnsupportedFormat()
    {
        _jobRepo.Setup(r => r.AddAsync(It.IsAny<ExportJob>())).Returns(Task.CompletedTask);

        var request = new CreateExportRequest("xml", "transactions", Guid.NewGuid().ToString());
        await _service.CreateExportJobAsync(request, _userId);

        _jobRepo.Verify(r => r.AddAsync(It.Is<ExportJob>(j => j.Format == ExportFormat.Json)), Times.Once);
    }

    [Fact]
    public async Task CreateExportJobAsync_ForcesJsonFormat_WhenContentTypeIsBackup()
    {
        _jobRepo.Setup(r => r.AddAsync(It.IsAny<ExportJob>())).Returns(Task.CompletedTask);

        var request = new CreateExportRequest("csv", "backup", null);
        await _service.CreateExportJobAsync(request, _userId);

        _jobRepo.Verify(r => r.AddAsync(It.Is<ExportJob>(j => j.Format == ExportFormat.Json)), Times.Once);
    }

    [Fact]
    public async Task CreateExportJobAsync_ThrowsDomainException_WhenUnknownContentType()
    {
        _jobRepo.Setup(r => r.AddAsync(It.IsAny<ExportJob>())).Returns(Task.CompletedTask);

        var request = new CreateExportRequest("csv", "unknown-type", null);
        await Assert.ThrowsAsync<DomainException>(() => _service.CreateExportJobAsync(request, _userId));
    }

    [Fact]
    public async Task GetExportStatusAsync_ReturnsStatus_WhenJobOwnedByUser()
    {
        var job = new ExportJob(ExportFormat.Csv, ExportContentType.Transactions, _userId);
        _jobRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync(job);

        var result = await _service.GetExportStatusAsync(Guid.NewGuid(), _userId);

        Assert.Equal(job.Id.ToString(), result.JobId);
        Assert.Equal("pending", result.Status);
        Assert.Null(result.DownloadUrl);
    }

    [Fact]
    public async Task GetExportStatusAsync_ReturnsDownloadUrl_WhenCompleted()
    {
        var job = new ExportJob(ExportFormat.Csv, ExportContentType.Transactions, _userId);
        job.SetProcessing();
        job.SetCompleted("/exports/file.csv");
        _jobRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync(job);

        var result = await _service.GetExportStatusAsync(job.Id, _userId);

        Assert.Equal("completed", result.Status);
        Assert.Equal($"/api/v1/exports/{job.Id}/download", result.DownloadUrl);
    }

    [Fact]
    public async Task GetExportStatusAsync_ThrowsNotFoundException_WhenNotOwnedByUser()
    {
        var otherUserId = Guid.NewGuid();
        var job = new ExportJob(ExportFormat.Csv, ExportContentType.Transactions, otherUserId);
        _jobRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync(job);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetExportStatusAsync(Guid.NewGuid(), _userId));
    }

    [Fact]
    public void ExportService_CreatesExportDirectory()
    {
        try { Directory.Delete(_testExportDir, true); } catch { }

        var _ = new ExportService(
            _jobRepo.Object, _bookRepo.Object, _transactionRepo.Object,
            _userRepo.Object, _categoryRepo.Object, _testExportDir);

        Assert.True(Directory.Exists(_testExportDir));
    }

    [Fact]
    public async Task ProcessExportAsync_GeneratesAndSavesFile()
    {
        var categories = new List<Category> { new("Test", _userId, null, null, 1, false) };
        _categoryRepo.Setup(r => r.GetByUserAsync(_userId)).ReturnsAsync(categories);

        var job = new ExportJob(ExportFormat.Json, ExportContentType.Categories, _userId);
        await _service.ProcessExportAsync(job);

        _jobRepo.Verify(r => r.UpdateAsync(It.IsAny<ExportJob>()), Times.Exactly(2));
        Assert.Equal(ExportJobStatus.Completed, job.Status);
        Assert.NotNull(job.FilePath);
    }

    [Fact]
    public async Task ProcessExportAsync_SetsFailed_WhenExceptionOccurs()
    {
        _categoryRepo.Setup(r => r.GetByUserAsync(_userId)).ThrowsAsync(new Exception("DB error"));

        var job = new ExportJob(ExportFormat.Json, ExportContentType.Categories, _userId);
        await _service.ProcessExportAsync(job);

        _jobRepo.Verify(r => r.UpdateAsync(It.IsAny<ExportJob>()), Times.Exactly(2));
        Assert.Equal(ExportJobStatus.Failed, job.Status);
        Assert.Equal("DB error", job.ErrorMessage);
    }

    [Fact]
    public async Task ProcessExportAsync_SetsFailed_WhenBookIdMissingForTransactions()
    {
        var job = new ExportJob(ExportFormat.Csv, ExportContentType.Transactions, _userId);
        await _service.ProcessExportAsync(job);

        Assert.Equal(ExportJobStatus.Failed, job.Status);
        Assert.NotNull(job.ErrorMessage);
        Assert.Null(job.FilePath);
        _transactionRepo.Verify(
            r => r.SearchAsync(
                It.IsAny<Guid?>(), It.IsAny<DateTimeOffset?>(), It.IsAny<DateTimeOffset?>(),
                It.IsAny<List<string>?>(), It.IsAny<List<Guid>?>(), It.IsAny<string?>(),
                It.IsAny<decimal?>(), It.IsAny<decimal?>(), It.IsAny<int>(), It.IsAny<int>(),
                It.IsAny<List<Guid>?>()),
            Times.Never);
    }

    [Fact]
    public async Task ProcessExportAsync_ScopesTransactionsToRequestedBook_WhenBookIdSupplied()
    {
        var bookId = Guid.NewGuid();
        var book = Book.Restore(bookId, "Main", _userId, null, BookStatus.Open);
        _bookRepo.Setup(r => r.GetVisibleBookAsync(bookId, _userId)).ReturnsAsync(book);
        _transactionRepo
            .Setup(r => r.SearchAsync(
                It.IsAny<Guid?>(), It.IsAny<DateTimeOffset?>(), It.IsAny<DateTimeOffset?>(),
                It.IsAny<List<string>?>(), It.IsAny<List<Guid>?>(), It.IsAny<string?>(),
                It.IsAny<decimal?>(), It.IsAny<decimal?>(), It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync(new List<Transaction>());

        var job = new ExportJob(ExportFormat.Csv, ExportContentType.Transactions, _userId, bookId);
        await _service.ProcessExportAsync(job);

        Assert.Equal(ExportJobStatus.Completed, job.Status);
        _transactionRepo.Verify(
            r => r.SearchAsync(bookId, null, null, null, null, null, null, null, 1, int.MaxValue),
            Times.Once);
    }

    [Fact]
    public async Task ProcessExportAsync_SetsFailed_WhenRequestedBookIsNotVisible()
    {
        var bookId = Guid.NewGuid();
        _bookRepo.Setup(r => r.GetVisibleBookAsync(bookId, _userId)).ReturnsAsync((Book?)null);

        var job = new ExportJob(ExportFormat.Csv, ExportContentType.Transactions, _userId, bookId);
        await _service.ProcessExportAsync(job);

        Assert.Equal(ExportJobStatus.Failed, job.Status);
        Assert.NotNull(job.ErrorMessage);
        Assert.Null(job.FilePath);
        _transactionRepo.Verify(
            r => r.SearchAsync(
                It.IsAny<Guid?>(), It.IsAny<DateTimeOffset?>(), It.IsAny<DateTimeOffset?>(),
                It.IsAny<List<string>?>(), It.IsAny<List<Guid>?>(), It.IsAny<string?>(),
                It.IsAny<decimal?>(), It.IsAny<decimal?>(), It.IsAny<int>(), It.IsAny<int>()),
            Times.Never);
    }

    [Fact]
    public async Task ProcessExportAsync_SanitisesBookNameUsedInFileName()
    {
        var bookId = Guid.NewGuid();
        var book = Book.Restore(bookId, "../../evil/name", _userId, null, BookStatus.Open);
        _bookRepo.Setup(r => r.GetVisibleBookAsync(bookId, _userId)).ReturnsAsync(book);
        _transactionRepo
            .Setup(r => r.SearchAsync(
                It.IsAny<Guid?>(), It.IsAny<DateTimeOffset?>(), It.IsAny<DateTimeOffset?>(),
                It.IsAny<List<string>?>(), It.IsAny<List<Guid>?>(), It.IsAny<string?>(),
                It.IsAny<decimal?>(), It.IsAny<decimal?>(), It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync(new List<Transaction>());

        var job = new ExportJob(ExportFormat.Csv, ExportContentType.Transactions, _userId, bookId);
        await _service.ProcessExportAsync(job);

        Assert.Equal(ExportJobStatus.Completed, job.Status);
        Assert.NotNull(job.FilePath);

        var fullPath = Path.GetFullPath(job.FilePath!);
        var exportRoot = Path.GetFullPath(_testExportDir) + Path.DirectorySeparatorChar;
        Assert.StartsWith(exportRoot, fullPath, StringComparison.Ordinal);

        var savedFileName = Path.GetFileName(fullPath);
        Assert.DoesNotContain("..", savedFileName);
        Assert.DoesNotContain('/', savedFileName);
        Assert.DoesNotContain('\\', savedFileName);
        Assert.True(File.Exists(fullPath));
    }
}
