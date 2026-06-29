using FluentValidation;
using ledger12.Application.DTOs;

namespace ledger12.Application.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
    }
}

public class CreateCategoryRequestValidator : AbstractValidator<CreateCategoryRequest>
{
    public CreateCategoryRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty();
    }
}

public class UpdateCategoryRequestValidator : AbstractValidator<UpdateCategoryRequest>
{
    public UpdateCategoryRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty();
    }
}

public class ReassignRequestValidator : AbstractValidator<ReassignRequest>
{
    public ReassignRequestValidator()
    {
        RuleFor(x => x.FromCategoryName).NotEmpty();
        RuleFor(x => x.ToCategoryName).NotEmpty();
    }
}

public class ReorderRequestValidator : AbstractValidator<ReorderRequest>
{
    public ReorderRequestValidator()
    {
        RuleFor(x => x.OrderedIds).NotEmpty();
    }
}

public class CreateBookRequestValidator : AbstractValidator<CreateBookRequest>
{
    public CreateBookRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty();
    }
}

public class UpdateBookRequestValidator : AbstractValidator<UpdateBookRequest>
{
    public UpdateBookRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty();
    }
}

public class CloseBookRequestValidator : AbstractValidator<CloseBookRequest>
{
    public CloseBookRequestValidator()
    {
        RuleFor(x => x.ClosingCategoryName).NotEmpty();
    }
}

public class SetCurrentBookRequestValidator : AbstractValidator<SetCurrentBookRequest>
{
    public SetCurrentBookRequestValidator()
    {
        RuleFor(x => x.BookId).NotEmpty();
    }
}

public class CreateTransactionRequestValidator : AbstractValidator<CreateTransactionRequest>
{
    public CreateTransactionRequestValidator()
    {
        RuleFor(x => x.BookId).NotEmpty();
        RuleFor(x => x.Amount).NotEmpty();
        // If originalCurrency is set, originalAmount and exchangeRate must also be set
        When(x => !string.IsNullOrEmpty(x.OriginalCurrency), () =>
        {
            RuleFor(x => x.OriginalAmount).NotNull().WithMessage("originalAmount is required when originalCurrency is set");
            RuleFor(x => x.ExchangeRate).NotNull().WithMessage("exchangeRate is required when originalCurrency is set");
        });
    }
}

public class UpdateTransactionRequestValidator : AbstractValidator<UpdateTransactionRequest>
{
    public UpdateTransactionRequestValidator()
    {
        RuleFor(x => x.Amount).NotEmpty();
        When(x => !string.IsNullOrEmpty(x.OriginalCurrency), () =>
        {
            RuleFor(x => x.OriginalAmount).NotNull();
            RuleFor(x => x.ExchangeRate).NotNull();
        });
    }
}

public class AddShareRequestValidator : AbstractValidator<AddShareRequest>
{
    public AddShareRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        // default permission is "edit"
        RuleFor(x => x.Permission)
            .Must(p => string.IsNullOrEmpty(p) || p is "view" or "edit")
            .WithMessage("Permission must be 'view' or 'edit'");
    }
}

public class UpdateShareRequestValidator : AbstractValidator<UpdateShareRequest>
{
    public UpdateShareRequestValidator()
    {
        RuleFor(x => x.Permission).NotEmpty().Must(p => p is "view" or "edit")
            .WithMessage("Permission must be 'view' or 'edit'");
    }
}

public class CreateExportRequestValidator : AbstractValidator<CreateExportRequest>
{
    public CreateExportRequestValidator()
    {
        RuleFor(x => x.ContentType).NotEmpty();
    }
}

public class ImportRequestValidator : AbstractValidator<ImportRequest>
{
    public ImportRequestValidator()
    {
        RuleFor(x => x.EntityType).NotEmpty();
    }
}
