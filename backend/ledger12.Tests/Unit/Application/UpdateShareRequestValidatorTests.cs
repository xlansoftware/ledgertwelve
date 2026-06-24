using FluentValidation.TestHelper;
using ledger12.Application.DTOs;
using ledger12.Application.Validators;

namespace ledger12.Tests.Unit.Application;

public class UpdateShareRequestValidatorTests
{
    private readonly UpdateShareRequestValidator _validator = new();

    [Fact]
    public void Validate_HasNoErrors_WhenPermissionIsView()
    {
        var request = new UpdateShareRequest("view");
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_HasNoErrors_WhenPermissionIsEdit()
    {
        var request = new UpdateShareRequest("edit");
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_HasError_WhenPermissionIsEmpty()
    {
        var request = new UpdateShareRequest("");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.Permission);
    }

    [Fact]
    public void Validate_HasError_WhenPermissionIsInvalid()
    {
        var request = new UpdateShareRequest("admin");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.Permission);
    }
}
