using ledger12.Application.DTOs;

namespace ledger12.Application.Interfaces;

public interface IExportService
{
    Task<ExportResponse> CreateExportJobAsync(CreateExportRequest request, Guid userId);
    Task<ExportStatusResponse> GetExportStatusAsync(Guid jobId, Guid userId);
    Task<(byte[] Data, string ContentType, string FileName)> DownloadExportAsync(Guid jobId, Guid userId);
}
