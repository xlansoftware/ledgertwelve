namespace ledger12.Application.Interfaces;

public interface IDefaultDataService
{
    Task EnsureDefaultsAsync(Guid userId);
}
