using FluentValidation.TestHelper;
using ledger12.Application.DTOs;
using ledger12.Application.Validators;

namespace ledger12.Tests.Unit.Application;

public class CreateExportRequestValidatorTests
{
    private readonly CreateExportRequestValidator _validator = new();

    [Fact]
    public void Validate_HasNoErrors_WhenContentTypeIsProvided()
    {
        var request = new CreateExportRequest("csv", "transactions", null);
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_HasError_WhenContentTypeIsEmpty()
    {
        var request = new CreateExportRequest("csv", "", null);
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.ContentType);
    }
}
