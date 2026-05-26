using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using ledger12.API.Models;
using ledger12.Infrastructure.Data;

namespace ledger12.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly SignInManager<AppUser> _signInManager;
    private readonly UserManager<AppUser> _userManager;

    public AuthController(SignInManager<AppUser> signInManager, UserManager<AppUser> userManager)
    {
        _signInManager = signInManager;
        _userManager = userManager;
    }

    [HttpPost("login")]
    public async Task<ActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByNameAsync(request.User);
        if (user is null)
        {
            return Unauthorized(new { error = "Invalid username or password." });
        }

        var result = await _signInManager.PasswordSignInAsync(
            user,
            request.Password,
            isPersistent: true,
            lockoutOnFailure: false);

        if (!result.Succeeded)
        {
            return Unauthorized(new { error = "Invalid username or password." });
        }

        return Ok(new { message = "Login successful." });
    }
}