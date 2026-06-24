using FluentValidation.TestHelper;
using ledger12.Application.DTOs;
using ledger12.Application.Validators;

namespace ledger12.Tests.Unit.Application;

public class CloseBookRequestValidatorTests
{
    private readonly CloseBookRequestValidator _validator = new();

    [Fact]
    public void Validate_HasNoErrors_WhenClosingCategoryNameIsProvided()
    {
        var request = new CloseBookRequest("Closing");
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_HasError_WhenClosingCategoryNameIsEmpty()
    {
        var request = new CloseBookRequest("");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.ClosingCategoryName);
    }
}
