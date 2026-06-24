using ledger12.Application.DTOs;

namespace ledger12.Application.Interfaces;

public interface IUserService
{
    Task<UserSummary> GetCurrentUserAsync(Guid userId);
    Task<List<UserSummary>> GetUsersAsync(Guid userId);
}
