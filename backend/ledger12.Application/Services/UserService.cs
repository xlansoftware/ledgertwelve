using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Domain.Entities;
using ledger12.Domain.Enums;
using ledger12.Domain.Exceptions;

namespace ledger12.Application.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepo;
    private readonly IBookRepository _bookRepo;

    public UserService(IUserRepository userRepo, IBookRepository bookRepo)
    {
        _userRepo = userRepo;
        _bookRepo = bookRepo;
    }

    public async Task<UserSummary> GetCurrentUserAsync(Guid userId)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        if (user == null) throw new NotFoundException("User", userId);
        return new UserSummary(user.Value.Id.ToString(), user.Value.Email);
    }

    public async Task<List<UserSummary>> GetUsersAsync(Guid userId)
    {
        var userIds = await _bookRepo.GetUserIdsWithAccessAsync(userId);
        if (!userIds.Contains(userId)) userIds.Add(userId);

        var users = await _userRepo.GetUsersByIdsAsync(userIds);
        return users.Select(u => new UserSummary(u.Id.ToString(), u.Email)).ToList();
    }
}
