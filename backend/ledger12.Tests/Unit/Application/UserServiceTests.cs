using Moq;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Application.Services;
using ledger12.Domain.Exceptions;

namespace ledger12.Tests.Unit.Application;

public class UserServiceTests
{
    private readonly Mock<IUserRepository> _userRepo;
    private readonly Mock<IBookRepository> _bookRepo;
    private readonly UserService _service;
    private readonly Guid _userId = Guid.NewGuid();

    public UserServiceTests()
    {
        _userRepo = new Mock<IUserRepository>();
        _bookRepo = new Mock<IBookRepository>();
        _service = new UserService(_userRepo.Object, _bookRepo.Object);
    }

    [Fact]
    public async Task GetCurrentUserAsync_ReturnsSummary_WhenUserExists()
    {
        var user = (_userId, "user@example.com");
        _userRepo.Setup(r => r.GetByIdAsync(_userId)).ReturnsAsync(user);

        var result = await _service.GetCurrentUserAsync(_userId);

        Assert.Equal(_userId.ToString(), result.Id);
        Assert.Equal("user@example.com", result.Email);
    }

    [Fact]
    public async Task GetCurrentUserAsync_ThrowsNotFoundException_WhenUserNotFound()
    {
        _userRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync(null as (Guid Id, string Email)?);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetCurrentUserAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task GetUsersAsync_ReturnsUsersWithAccess()
    {
        var sharedUserId = Guid.NewGuid();
        var ids = new List<Guid> { sharedUserId };
        _bookRepo.Setup(r => r.GetUserIdsWithAccessAsync(_userId)).ReturnsAsync(ids);

        var users = new List<(Guid Id, string Email)>
        {
            (_userId, "me@example.com"),
            (sharedUserId, "shared@example.com")
        };
        _userRepo.Setup(r => r.GetUsersByIdsAsync(It.IsAny<List<Guid>>())).ReturnsAsync(users);

        var result = await _service.GetUsersAsync(_userId);

        Assert.Equal(2, result.Count);
        Assert.Contains(result, u => u.Email == "me@example.com");
        Assert.Contains(result, u => u.Email == "shared@example.com");
    }

    [Fact]
    public async Task GetUsersAsync_IncludesCurrentUser_WhenNotInList()
    {
        _bookRepo.Setup(r => r.GetUserIdsWithAccessAsync(_userId)).ReturnsAsync(new List<Guid>());
        _userRepo.Setup(r => r.GetUsersByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(new List<(Guid Id, string Email)> { (_userId, "me@example.com") });

        var result = await _service.GetUsersAsync(_userId);

        Assert.Single(result);
        Assert.Equal("me@example.com", result[0].Email);
    }

    [Fact]
    public async Task GetUsersAsync_ReturnsEmptyList_WhenNoUsers()
    {
        _bookRepo.Setup(r => r.GetUserIdsWithAccessAsync(_userId)).ReturnsAsync(new List<Guid>());
        _userRepo.Setup(r => r.GetUsersByIdsAsync(It.IsAny<List<Guid>>()))
            .ReturnsAsync(new List<(Guid Id, string Email)>());

        var result = await _service.GetUsersAsync(_userId);

        Assert.Empty(result);
    }
}
