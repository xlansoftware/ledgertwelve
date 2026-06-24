using FluentValidation.TestHelper;
using ledger12.Application.DTOs;
using ledger12.Application.Validators;

namespace ledger12.Tests.Unit.Application;

public class ReassignRequestValidatorTests
{
    private readonly ReassignRequestValidator _validator = new();

    [Fact]
    public void Validate_HasNoErrors_WhenBothNamesAreProvided()
    {
        var request = new ReassignRequest("Old", "New");
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_HasError_WhenFromCategoryNameIsEmpty()
    {
        var request = new ReassignRequest("", "New");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.FromCategoryName);
    }

    [Fact]
    public void Validate_HasError_WhenToCategoryNameIsEmpty()
    {
        var request = new ReassignRequest("Old", "");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.ToCategoryName);
    }
}
