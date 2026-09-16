using ledger12.Application.DTOs;
using ledger12.Domain.Entities;

namespace ledger12.Application.Interfaces;

public interface IExportService
{
    Task<ExportResponse> CreateExportJobAsync(CreateExportRequest request, Guid userId);
    Task<ExportStatusResponse> GetExportStatusAsync(Guid jobId, Guid userId);
    Task<(byte[] Data, string ContentType, string FileName)> DownloadExportAsync(Guid jobId, Guid userId);

    // Executed by the background processor. Generates the export file and updates the job.
    Task ProcessExportAsync(ExportJob job);
}
