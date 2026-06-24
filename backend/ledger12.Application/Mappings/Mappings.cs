using ledger12.Application.DTOs;
using ledger12.Domain.Entities;

namespace ledger12.Application.Mappings;

public static class CategoryMappings
{
    public static CategoryDto ToDto(this Category category) => new(
        category.Id.ToString(),
        category.Name,
        category.Recurring,
        category.Color,
        category.Icon,
        category.Order,
        category.CreatedAt.ToString("o")
    );
}

public static class TransactionMappings
{
    public static TransactionDto ToDto(this Transaction transaction) => new(
        transaction.Id.ToString(),
        transaction.BookId.ToString(),
        transaction.UserId.ToString(),
        transaction.DateTime.ToString("o"),
        transaction.Amount,
        transaction.OriginalCurrency,
        transaction.OriginalAmount,
        transaction.ExchangeRate,
        transaction.CategoryName,
        transaction.Note,
        transaction.CreatedAt.ToString("o"),
        transaction.IsBookClosingEntry,
        transaction.ClosedBookId?.ToString()
    );
}

public static class BookMappings
{
    public static BookDto ToDto(this Book book) => new(
        book.Id.ToString(),
        book.Name,
        book.Currency,
        book.Status.ToString().ToLowerInvariant(),
        book.OwnerId.ToString(),
        book.Shares?.Select(s => new SharedUserDto(
            s.UserId.ToString(),
            "", // email resolved in service
            s.Permission.ToString().ToLowerInvariant()
        )).ToList() ?? new(),
        book.CreatedAt.ToString("o"),
        book.ClosedAt?.ToString("o")
    );
}
