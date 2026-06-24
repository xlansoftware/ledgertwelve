using FluentValidation.TestHelper;
using ledger12.Application.DTOs;
using ledger12.Application.Validators;

namespace ledger12.Tests.Unit.Application;

public class LoginRequestValidatorTests
{
    private readonly LoginRequestValidator _validator = new();

    [Fact]
    public void Validate_HasNoErrors_WhenRequestIsValid()
    {
        var request = new LoginRequest("user@example.com", "password123");
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_HasError_WhenEmailIsEmpty()
    {
        var request = new LoginRequest("", "password123");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.Email);
    }

    [Fact]
    public void Validate_HasError_WhenEmailIsInvalid()
    {
        var request = new LoginRequest("not-an-email", "password123");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.Email);
    }

    [Fact]
    public void Validate_HasError_WhenPasswordIsEmpty()
    {
        var request = new LoginRequest("user@example.com", "");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.Password);
    }
}
