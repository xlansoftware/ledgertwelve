using FluentValidation.TestHelper;
using ledger12.Application.DTOs;
using ledger12.Application.Validators;

namespace ledger12.Tests.Unit.Application;

public class SetCurrentBookRequestValidatorTests
{
    private readonly SetCurrentBookRequestValidator _validator = new();

    [Fact]
    public void Validate_HasNoErrors_WhenBookIdIsProvided()
    {
        var request = new SetCurrentBookRequest(Guid.NewGuid().ToString());
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_HasError_WhenBookIdIsEmpty()
    {
        var request = new SetCurrentBookRequest("");
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.BookId);
    }
}
