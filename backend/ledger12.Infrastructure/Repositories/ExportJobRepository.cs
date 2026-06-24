using Microsoft.EntityFrameworkCore;
using ledger12.Application.Interfaces;
using ledger12.Domain.Entities;
using ledger12.Infrastructure.Data;

namespace ledger12.Infrastructure.Repositories;

public class ExportJobRepository : IExportJobRepository
{
    private readonly AppDbContext _context;

    public ExportJobRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ExportJob?> GetByIdAsync(Guid id)
    {
        return await _context.ExportJobs.FindAsync(id);
    }

    public async Task AddAsync(ExportJob job)
    {
        await _context.ExportJobs.AddAsync(job);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(ExportJob job)
    {
        _context.ExportJobs.Update(job);
        await _context.SaveChangesAsync();
    }

    public async Task<List<ExportJob>> GetPendingJobsAsync()
    {
        return await _context.ExportJobs
            .Where(j => j.Status == Domain.Enums.ExportJobStatus.Pending)
            .OrderBy(j => j.CreatedAt)
            .ToListAsync();
    }
}
