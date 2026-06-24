namespace ledger12.Application.DTOs;

// --- Auth ---
public record LoginRequest(string Email, string Password);
public record RegisterRequest(string Email, string Password);
public record UserSummary(string Id, string Email);
public record AuthResponse(UserSummary Data);

// --- Categories ---
public record CreateCategoryRequest(string Name, bool? Recurring, string? Color, string? Icon);
public record UpdateCategoryRequest(string Name, bool? Recurring, string? Color, string? Icon);
public record CategoryDto(string Id, string Name, bool? Recurring, string? Color, string? Icon, int? Order, string CreatedAt);
public record ReassignRequest(string FromCategoryName, string ToCategoryName);
public record ReorderRequest(List<string> OrderedIds);
public record DeleteCategoryResponse(int ReassignedTransactions);
public record ReassignCategoryResponse(int AffectedTransactions);
public record ReorderResponse(bool Success);

// --- Books ---
public record CreateBookRequest(string Name, string? Currency);
public record UpdateBookRequest(string Name, string? Currency);
public record BookDto(
    string Id,
    string Name,
    string? Currency,
    string Status,
    string? OwnerId,
    List<SharedUserDto> SharedWith,
    string CreatedAt,
    string? ClosedAt
);
public record SharedUserDto(string UserId, string Email, string Permission);
public record CloseBookRequest(string ClosingCategoryName);
public record CloseBookResponse(string BookId, string Status, string ClosingTransactionId, decimal NetBalance);
public record ReopenBookResponse(string BookId, string Status);
public record BookStatsResponse(int TransactionCount, decimal TotalSum);
public record SetCurrentBookRequest(string BookId);

// --- Transactions ---
public record CreateTransactionRequest(
    Guid BookId,
    DateTimeOffset DateTime,
    decimal Amount,
    string? OriginalCurrency,
    decimal? OriginalAmount,
    decimal? ExchangeRate,
    string? CategoryName,
    string? Note
);
public record UpdateTransactionRequest(
    DateTimeOffset DateTime,
    decimal Amount,
    string? OriginalCurrency,
    decimal? OriginalAmount,
    decimal? ExchangeRate,
    string? CategoryName,
    string? Note
);
public record TransactionDto(
    string Id,
    string BookId,
    string UserId,
    string DateTime,
    decimal Amount,
    string? OriginalCurrency,
    decimal? OriginalAmount,
    decimal? ExchangeRate,
    string? CategoryName,
    string? Note,
    string CreatedAt,
    bool IsBookClosingEntry,
    string? ClosedBookId
);
public record DeleteTransactionResponse(bool Deleted);

// --- Shares ---
public record AddShareRequest(string Email, string Permission);
public record UpdateShareRequest(string Permission);
public record CreateShareResponse(string UserId, string Email, int AffectedBooks);
public record RemoveShareResponse(bool Removed, int AffectedBooks);

// --- Exchange Rates ---
public record ExchangeRateResponse(string From, string To, decimal Rate);

// --- Reports ---
public record TotalsReportItem(string Period, decimal Income, decimal Expense, decimal Net);
public record CategoryReportItem(string CategoryName, decimal Amount);
public record DailyReportItem(string Date, decimal Amount);
public record MonthlyReportItem(string Period, decimal Amount);
public record AverageReportItem(decimal Average, int Count);
public record CategoryBreakdownConfig(string? From, string? To);

// --- Export ---
public record CreateExportRequest(string? Format, string ContentType, string? BookId);
public record ExportResponse(string JobId, string Status);
public record ExportStatusResponse(string JobId, string Status, string? DownloadUrl, string? ErrorMessage);

// --- Import ---
public record ImportIssue(int? Row, string? Field, string Message, string Severity);
public record EntityImportResult(int Created, int Updated, int Deleted, int Errors, int Warnings, List<ImportIssue> Issues);
public record ImportRequest(
    bool Preview,
    string EntityType,
    string? BookId,
    bool? ClearExisting,
    Dictionary<string, string>? Mapping,
    List<Dictionary<string, object?>>? Rows,
    Dictionary<string, object?>? Data
);
public record BackupImportResult(EntityImportResult Books, EntityImportResult Categories, EntityImportResult Transactions);
public record ImportResponse(object Data);

// --- Pagination ---
public record Meta(int Page, int PageSize, int Total);
public record PagedResponse<T>(List<T> Data, Meta Meta);

// --- Generic ---
public record SuccessResponse(bool Success);
public record ErrorResponse(string Error);
