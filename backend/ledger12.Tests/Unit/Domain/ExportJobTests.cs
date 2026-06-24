using ledger12.Domain.Entities;
using ledger12.Domain.Enums;

namespace ledger12.Tests.Unit.Domain;

public class ExportJobTests
{
    private readonly Guid _userId = Guid.NewGuid();

    [Fact]
    public void Constructor_SetsPendingStatus_WhenCreated()
    {
        var job = new ExportJob(ExportFormat.Csv, ExportContentType.Transactions, _userId);

        Assert.NotEqual(Guid.Empty, job.Id);
        Assert.Equal(ExportJobStatus.Pending, job.Status);
        Assert.Equal(ExportFormat.Csv, job.Format);
        Assert.Equal(ExportContentType.Transactions, job.ContentType);
        Assert.Equal(_userId, job.UserId);
        Assert.Null(job.BookId);
        Assert.Null(job.FilePath);
        Assert.Null(job.ErrorMessage);
    }

    [Fact]
    public void Constructor_SetsBookId_WhenProvided()
    {
        var bookId = Guid.NewGuid();
        var job = new ExportJob(ExportFormat.Json, ExportContentType.Books, _userId, bookId);

        Assert.Equal(bookId, job.BookId);
    }

    [Fact]
    public void SetProcessing_UpdatesStatus()
    {
        var job = new ExportJob(ExportFormat.Csv, ExportContentType.Transactions, _userId);

        job.SetProcessing();

        Assert.Equal(ExportJobStatus.Processing, job.Status);
    }

    [Fact]
    public void SetCompleted_SetsStatusAndFilePath()
    {
        var job = new ExportJob(ExportFormat.Csv, ExportContentType.Transactions, _userId);
        job.SetProcessing();

        job.SetCompleted("/exports/file.csv");

        Assert.Equal(ExportJobStatus.Completed, job.Status);
        Assert.Equal("/exports/file.csv", job.FilePath);
    }

    [Fact]
    public void SetFailed_SetsStatusAndErrorMessage()
    {
        var job = new ExportJob(ExportFormat.Csv, ExportContentType.Transactions, _userId);

        job.SetFailed("Something went wrong");

        Assert.Equal(ExportJobStatus.Failed, job.Status);
        Assert.Equal("Something went wrong", job.ErrorMessage);
    }
}
