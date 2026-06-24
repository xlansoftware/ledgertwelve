using FluentValidation.TestHelper;
using ledger12.Application.DTOs;
using ledger12.Application.Validators;

namespace ledger12.Tests.Unit.Application;

public class UpdateTransactionRequestValidatorTests
{
    private readonly UpdateTransactionRequestValidator _validator = new();

    [Fact]
    public void Validate_HasNoErrors_WhenRequestIsValid()
    {
        var request = new UpdateTransactionRequest(
            DateTimeOffset.UtcNow, 100m, null, null, null, null, null);
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_HasError_WhenAmountIsZero()
    {
        var request = new UpdateTransactionRequest(
            DateTimeOffset.UtcNow, 0, null, null, null, null, null);
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.Amount);
    }

    [Fact]
    public void Validate_HasError_WhenOriginalCurrencySetButOriginalAmountMissing()
    {
        var request = new UpdateTransactionRequest(
            DateTimeOffset.UtcNow, -100m, "USD", null, null, null, null);
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.OriginalAmount);
    }

    [Fact]
    public void Validate_HasError_WhenOriginalCurrencySetButExchangeRateMissing()
    {
        var request = new UpdateTransactionRequest(
            DateTimeOffset.UtcNow, -100m, "USD", 150m, null, null, null);
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(r => r.ExchangeRate);
    }
}
