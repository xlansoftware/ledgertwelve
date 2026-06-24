using FluentValidation.TestHelper;
using ledger12.Application.DTOs;
using ledger12.Application.Validators;

namespace ledger12.Tests.Unit.Application;

public class ImportRequestValidatorTests
{
    private readonly ImportRequestValidator _validator = new();

    [Fact]
    public void Validate_HasNoErrors_WhenEntityTypeIsProvided()
    {
        var request = new ImportRequest(true, "transactions", null, null, null, null, null);
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_HasError_WhenEntityTypeIsEmpty()
    {
        var request = new ImportRequest(true, "", null, null, null, null, null);
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.EntityType);
    }
}
