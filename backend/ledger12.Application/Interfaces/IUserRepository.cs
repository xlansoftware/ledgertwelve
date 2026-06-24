using ledger12.Domain.Entities;

namespace ledger12.Application.Interfaces;

public interface IUserRepository
{
    Task<(Guid Id, string Email)?> FindByEmailAsync(string email);
    Task<(Guid Id, string Email)?> GetByIdAsync(Guid userId);
    Task<List<(Guid Id, string Email)>> GetUsersByIdsAsync(List<Guid> userIds);
}
