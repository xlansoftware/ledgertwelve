using FluentValidation.TestHelper;
using ledger12.Application.DTOs;
using ledger12.Application.Validators;

namespace ledger12.Tests.Unit.Application;

public class UpdateBookRequestValidatorTests
{
    private readonly UpdateBookRequestValidator _validator = new();

    [Fact]
    public void Validate_HasNoErrors_WhenNameIsProvided()
    {
        var request = new UpdateBookRequest("Updated Book", "USD");
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_HasError_WhenNameIsEmpty()
    {
        var request = new UpdateBookRequest("", "USD");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.Name);
    }
}
