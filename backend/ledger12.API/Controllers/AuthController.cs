using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Infrastructure.Data;

namespace ledger12.API.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly SignInManager<AppUser> _signInManager;
    private readonly UserManager<AppUser> _userManager;
    private readonly IBookRepository _bookRepo;
    private readonly ICurrentUserService _currentUser;

    public AuthController(
        SignInManager<AppUser> signInManager,
        UserManager<AppUser> userManager,
        IBookRepository bookRepo,
        ICurrentUserService currentUser)
    {
        _signInManager = signInManager;
        _userManager = userManager;
        _bookRepo = bookRepo;
        _currentUser = currentUser;
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null)
            return Unauthorized(new { error = "Invalid email or password." });

        var result = await _signInManager.PasswordSignInAsync(
            user, request.Password, isPersistent: true, lockoutOnFailure: false);

        if (!result.Succeeded)
            return Unauthorized(new { error = "Invalid email or password." });

        return Ok(new AuthResponse(new UserSummary(user.Id, user.Email!)));
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
            return BadRequest(new { error = "Email is already registered." });

        var user = new AppUser
        {
            UserName = request.Email,
            Email = request.Email,
            EmailConfirmed = true
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            var errors = string.Join("; ", createResult.Errors.Select(e => e.Description));
            return BadRequest(new { error = errors });
        }

        // Create Main book atomically
        var userId = Guid.Parse(user.Id);
        var mainBook = new Domain.Entities.Book("Main", userId, "EUR");
        await _bookRepo.AddAsync(mainBook);

        await _signInManager.SignInAsync(user, isPersistent: true);
        return CreatedAtAction(nameof(Whoami), null, new AuthResponse(new UserSummary(user.Id, user.Email!)));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<ActionResult> Logout()
    {
        await _signInManager.SignOutAsync();
        return Ok(new { data = new { success = true } });
    }

    [HttpGet("whoami")]
    public async Task<ActionResult<AuthResponse>> Whoami()
    {
        if (_currentUser.UserId == Guid.Empty)
            return Unauthorized(new { error = "Unauthorized" });

        var user = await _userManager.FindByIdAsync(_currentUser.UserId.ToString());
        if (user == null)
            return Unauthorized(new { error = "Unauthorized" });

        return Ok(new AuthResponse(new UserSummary(user.Id, user.Email!)));
    }
}
