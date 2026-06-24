using ledger12.Domain.Entities;

namespace ledger12.Application.Interfaces;

public interface IExportJobRepository
{
    Task<ExportJob?> GetByIdAsync(Guid id);
    Task AddAsync(ExportJob job);
    Task UpdateAsync(ExportJob job);
    Task<List<ExportJob>> GetPendingJobsAsync();
}
