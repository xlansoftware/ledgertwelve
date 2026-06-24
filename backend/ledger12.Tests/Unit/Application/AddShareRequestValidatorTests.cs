using FluentValidation.TestHelper;
using ledger12.Application.DTOs;
using ledger12.Application.Validators;

namespace ledger12.Tests.Unit.Application;

public class AddShareRequestValidatorTests
{
    private readonly AddShareRequestValidator _validator = new();

    [Fact]
    public void Validate_HasNoErrors_WhenRequestIsValid()
    {
        var request = new AddShareRequest("user@example.com", "view");
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_HasError_WhenEmailIsEmpty()
    {
        var request = new AddShareRequest("", "view");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.Email);
    }

    [Fact]
    public void Validate_HasError_WhenEmailIsInvalid()
    {
        var request = new AddShareRequest("not-an-email", "view");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.Email);
    }

    [Fact]
    public void Validate_HasError_WhenPermissionIsEmpty()
    {
        var request = new AddShareRequest("user@example.com", "");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.Permission);
    }

    [Fact]
    public void Validate_HasError_WhenPermissionIsInvalid()
    {
        var request = new AddShareRequest("user@example.com", "admin");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.Permission);
    }

    [Fact]
    public void Validate_HasNoErrors_WhenPermissionIsEdit()
    {
        var request = new AddShareRequest("user@example.com", "edit");
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }
}
