using System.Security.Claims;
using ledger12.Application.Interfaces;
using Microsoft.AspNetCore.Http;

namespace ledger12.Infrastructure.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid UserId
    {
        get
        {
            var id = UserIdString;
            if (string.IsNullOrEmpty(id) || !Guid.TryParse(id, out var userId))
                return Guid.Empty;
            return userId;
        }
    }

    public string? UserIdString
    {
        get
        {
            return _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }
    }
}
