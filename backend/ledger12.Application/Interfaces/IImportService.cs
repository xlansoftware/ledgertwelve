using ledger12.Application.DTOs;

namespace ledger12.Application.Interfaces;

public interface IImportService
{
    Task<ImportResponse> ImportAsync(ImportRequest request, Guid userId);
}
