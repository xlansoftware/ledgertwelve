using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Domain;

namespace ledger12.Application.Services;

public class DashboardService : IDashboardService
{
    private readonly ITransactionRepository _repository;

    public DashboardService(ITransactionRepository repository)
    {
        _repository = repository;
    }

    public async Task<PagedResult<AggregateResponse>> GetDashboardAsync(Granularity granularity, DashboardQuery query)
    {
        // Clamp page/pageSize to safe defaults
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize < 1 ? 1 : query.PageSize > 1000 ? 1000 : query.PageSize;

        // Sane date defaults: 90-day window ending today
        var to = query.To ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var from = query.From ?? to.AddDays(-90);

        if (from > to)
            throw new ArgumentException("The 'from' date must not be after the 'to' date.");

        var filter = new AggregateFilter(from, to, query.Book, query.Author, query.Category, query.Currency, page, pageSize);

        PagedResult<IAggregateEntity> result = granularity switch
        {
            Granularity.Daily => await GetAsync<DailyAggregate>(granularity, filter),
            Granularity.Weekly => await GetAsync<WeeklyAggregate>(granularity, filter),
            Granularity.Monthly => await GetAsync<MonthlyAggregate>(granularity, filter),
            Granularity.Yearly => await GetAsync<YearlyAggregate>(granularity, filter),
            _ => throw new ArgumentOutOfRangeException(nameof(granularity), granularity, null)
        };

        var items = result.Items
            .Select(MapToResponse)
            .ToList();

        return new PagedResult<AggregateResponse>(items, result.TotalCount, result.Page, result.PageSize);
    }

    private async Task<PagedResult<IAggregateEntity>> GetAsync<T>(Granularity granularity, AggregateFilter filter)
        where T : class, IAggregateEntity
    {
        var result = await _repository.GetAggregatesAsync<T>(granularity, filter);
        return new PagedResult<IAggregateEntity>(
            result.Items,
            result.TotalCount,
            result.Page,
            result.PageSize
        );
    }

    private static AggregateResponse MapToResponse(IAggregateEntity entity)
    {
        return new AggregateResponse(
            entity.PeriodStart,
            entity.Book,
            entity.Author,
            entity.Category,
            entity.Currency,
            entity.SumValue,
            entity.TransactionCount
        );
    }
}