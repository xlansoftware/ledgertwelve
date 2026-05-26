using ledger12.Application.DTOs;
using ledger12.Domain;

namespace ledger12.Application.Interfaces;

public interface IDashboardService
{
    Task<PagedResult<AggregateResponse>> GetDashboardAsync(Granularity granularity, DashboardQuery query);
}