using ledger12.Domain.Enums;

namespace ledger12.Domain.Entities;

public class ExportJob
{
    public Guid Id { get; private set; }
    public ExportJobStatus Status { get; private set; }
    public ExportFormat Format { get; private set; }
    public ExportContentType ContentType { get; private set; }
    public Guid? BookId { get; private set; }
    public Guid UserId { get; private set; }
    public string? FilePath { get; private set; }
    public string? ErrorMessage { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private ExportJob() { }

    public ExportJob(ExportFormat format, ExportContentType contentType, Guid userId, Guid? bookId = null)
    {
        Id = Guid.NewGuid();
        Status = ExportJobStatus.Pending;
        Format = format;
        ContentType = contentType;
        UserId = userId;
        BookId = bookId;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public void SetProcessing()
    {
        Status = ExportJobStatus.Processing;
    }

    public void SetCompleted(string filePath)
    {
        Status = ExportJobStatus.Completed;
        FilePath = filePath;
    }

    public void SetFailed(string errorMessage)
    {
        Status = ExportJobStatus.Failed;
        ErrorMessage = errorMessage;
    }
}
