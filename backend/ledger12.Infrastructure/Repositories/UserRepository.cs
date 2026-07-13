using Microsoft.EntityFrameworkCore;
using ledger12.Application.Interfaces;
using ledger12.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Query;
using Microsoft.Build.Experimental.ProjectCache;

namespace ledger12.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
  private readonly AppDbContext _context;

  public UserRepository(AppDbContext context)
  {
    _context = context;
  }

  public async Task<(Guid Id, string Email)?> FindByEmailAsync(string email)
  {
    var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
    if (user == null) return null;
    return (Guid.Parse(user.Id), user.Email!);
  }

  public async Task<(Guid Id, string Email)?> GetByIdAsync(Guid userId)
  {
    var user = await _context.Users.FindAsync(userId.ToString());
    if (user == null) return null;
    return (Guid.Parse(user.Id), user.Email!);
  }

  public async Task<List<(Guid Id, string Email)>> GetUsersByIdsAsync(List<Guid> userIds)
  {
    var includeIds = userIds.ToHashSet();

    var users = await _context.Users
        .Select(u => new { Id = Guid.Parse(u.Id), Email = u.Email! })
        .ToListAsync();

    return users
        .Where(u => includeIds.Contains(u.Id))
        .Select(u => (u.Id, u.Email))
        .ToList();
  }
}
