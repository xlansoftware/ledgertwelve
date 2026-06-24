using FluentValidation.TestHelper;
using ledger12.Application.DTOs;
using ledger12.Application.Validators;

namespace ledger12.Tests.Unit.Application;

public class RegisterRequestValidatorTests
{
    private readonly RegisterRequestValidator _validator = new();

    [Fact]
    public void Validate_HasNoErrors_WhenRequestIsValid()
    {
        var request = new RegisterRequest("user@example.com", "password123");
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_HasError_WhenEmailIsEmpty()
    {
        var request = new RegisterRequest("", "password123");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.Email);
    }

    [Fact]
    public void Validate_HasError_WhenEmailIsInvalid()
    {
        var request = new RegisterRequest("not-an-email", "password123");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.Email);
    }

    [Fact]
    public void Validate_HasError_WhenPasswordIsEmpty()
    {
        var request = new RegisterRequest("user@example.com", "");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.Password);
    }

    [Fact]
    public void Validate_HasError_WhenPasswordIsTooShort()
    {
        var request = new RegisterRequest("user@example.com", "abc12");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.Password);
    }
}
