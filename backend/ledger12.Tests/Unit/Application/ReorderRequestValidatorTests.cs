using FluentValidation.TestHelper;
using ledger12.Application.DTOs;
using ledger12.Application.Validators;

namespace ledger12.Tests.Unit.Application;

public class ReorderRequestValidatorTests
{
    private readonly ReorderRequestValidator _validator = new();

    [Fact]
    public void Validate_HasNoErrors_WhenOrderedIdsIsNotEmpty()
    {
        var request = new ReorderRequest(new List<string> { "id1", "id2" });
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_HasError_WhenOrderedIdsIsEmpty()
    {
        var request = new ReorderRequest(new List<string>());
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.OrderedIds);
    }
}
