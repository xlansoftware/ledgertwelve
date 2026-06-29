using System.Diagnostics;
using System.Text.Json;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Domain.Entities;
using ledger12.Domain.Exceptions;

namespace ledger12.Application.Services;

public class ImportService : IImportService
{
    private readonly ITransactionRepository _transactionRepo;
    private readonly ICategoryRepository _categoryRepo;
    private readonly IBookRepository _bookRepo;
    private readonly IUserRepository _userRepo;

    public ImportService(
        ITransactionRepository transactionRepo,
        ICategoryRepository categoryRepo,
        IBookRepository bookRepo,
        IUserRepository userRepo)
    {
        _transactionRepo = transactionRepo;
        _categoryRepo = categoryRepo;
        _bookRepo = bookRepo;
        _userRepo = userRepo;
    }

    public async Task<ImportResponse> ImportAsync(ImportRequest request, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(request.EntityType))
            throw new DomainException("entityType is required");

        var entityType = request.EntityType.ToLowerInvariant();

        if (entityType == "backup")
            return await ImportBackupAsync(request, userId);

        if (entityType is not ("transactions" or "categories" or "books"))
            throw new DomainException($"Unknown entityType: \"{request.EntityType}\". Must be transactions, categories, books, or backup.");

        if (request.Rows == null)
            throw new DomainException($"rows array is required for {entityType} entityType");

        if (entityType == "transactions" && string.IsNullOrWhiteSpace(request.BookId))
            throw new DomainException("bookId is required for transaction imports");

        return entityType switch
        {
            "transactions" => await ImportTransactionsAsync(request, userId),
            "categories" => await ImportCategoriesAsync(request, userId),
            "books" => await ImportBooksAsync(request, userId),
            _ => throw new DomainException($"Unknown entityType: {request.EntityType}")
        };
    }

    private async Task<ImportResponse> ImportTransactionsAsync(ImportRequest request, Guid userId)
    {
        Debugger.Launch();
        var bookId = Guid.Parse(request.BookId!);
        var visible = await _bookRepo.HasEditAccessAsync(bookId, userId);
        if (!visible) throw new NotFoundException("Book", bookId);

        var issues = new List<ImportIssue>();
        int created = 0, updated = 0, deleted = 0;

        if (request.ClearExisting == true && !request.Preview)
        {
            // Delete existing transactions in book - we'll just mark it
            deleted = 0; // Simplified
        }

        foreach (var (row, idx) in request.Rows!.Select((r, i) => (r, i)))
        {
            var rowNum = idx + 1;
            try
            {
                var amount = GetRowValue<decimal>(row, "amount");
                if (amount == null)
                {
                    issues.Add(new ImportIssue(rowNum, "amount", "Amount is required", "error"));
                    continue;
                }

                var dtStr = GetRowString(row, "dateTime");
                if (!DateTimeOffset.TryParse(dtStr, out var dateTime))
                    dateTime = DateTimeOffset.UtcNow;

                var note = GetRowString(row, "note");
                var categoryName = GetRowString(row, "categoryName");
                var originalCurrency = GetRowString(row, "originalCurrency");
                var originalAmount = GetRowValue<decimal>(row, "originalAmount");
                var exchangeRate = GetRowValue<decimal>(row, "exchangeRate");

                // Validate multi-currency
                if (!string.IsNullOrEmpty(originalCurrency) && (originalAmount == null || exchangeRate == null))
                {
                    issues.Add(new ImportIssue(rowNum, "originalCurrency", "originalAmount and exchangeRate required with originalCurrency", "error"));
                    continue;
                }

                // Check for upsert
                var rowBookId = bookId;
                var rowBookIdStr = GetRowString(row, "bookId");
                if (!string.IsNullOrEmpty(rowBookIdStr) && Guid.TryParse(rowBookIdStr, out var rbid))
                    rowBookId = rbid;

                var rowId = GetRowString(row, "id");

                if (!request.Preview)
                {
                    if (!string.IsNullOrEmpty(rowId) && Guid.TryParse(rowId, out var existingId))
                    {
                        var existing = await _transactionRepo.GetByIdAsync(existingId);
                        if (existing != null)
                        {
                            existing.Update(dateTime, amount.Value, originalCurrency, originalAmount, exchangeRate, categoryName, note);
                            await _transactionRepo.UpdateAsync(existing);
                            updated++;
                            continue;
                        }
                    }

                    var tx = new Transaction(rowBookId, userId, dateTime, amount.Value, originalCurrency, originalAmount, exchangeRate, categoryName, note);
                    await _transactionRepo.AddAsync(tx);
                    created++;
                }
                else
                {
                    created++;
                }
            }
            catch (Exception ex)
            {
                issues.Add(new ImportIssue(rowNum, null, ex.Message, "error"));
            }
        }

        return new ImportResponse(new EntityImportResult(created, updated, deleted, issues.Count(i => i.Severity == "error"), issues.Count(i => i.Severity == "warning"), issues));
    }

    private async Task<ImportResponse> ImportCategoriesAsync(ImportRequest request, Guid userId)
    {
        var issues = new List<ImportIssue>();
        int created = 0, updated = 0, deleted = 0;

        foreach (var (row, idx) in request.Rows!.Select((r, i) => (r, i)))
        {
            var rowNum = idx + 1;
            try
            {
                var name = GetRowString(row, "name");
                if (string.IsNullOrWhiteSpace(name))
                {
                    issues.Add(new ImportIssue(rowNum, "name", "Name is required", "error"));
                    continue;
                }

                var color = GetRowString(row, "color");
                var icon = GetRowString(row, "icon");
                var recurring = GetRowValue<bool>(row, "recurring") ?? false;
                var rowId = GetRowString(row, "id");

                if (!request.Preview)
                {
                    if (!string.IsNullOrEmpty(rowId) && Guid.TryParse(rowId, out var existingId))
                    {
                        var existing = await _categoryRepo.GetByIdAsync(existingId);
                        if (existing != null && existing.UserId == userId)
                        {
                            existing.Update(name, recurring, color, icon);
                            await _categoryRepo.UpdateAsync(existing);
                            updated++;
                            continue;
                        }
                    }

                    var maxOrder = await _categoryRepo.GetMaxOrderAsync(userId);
                    var cat = new Category(name, userId, color, icon, maxOrder + 1, recurring);
                    await _categoryRepo.AddAsync(cat);
                    created++;
                }
                else
                {
                    created++;
                }
            }
            catch (Exception ex)
            {
                issues.Add(new ImportIssue(rowNum, null, ex.Message, "error"));
            }
        }

        return new ImportResponse(new EntityImportResult(created, updated, deleted, issues.Count(i => i.Severity == "error"), issues.Count(i => i.Severity == "warning"), issues));
    }

    private async Task<ImportResponse> ImportBooksAsync(ImportRequest request, Guid userId)
    {
        var issues = new List<ImportIssue>();
        int created = 0, updated = 0, deleted = 0;

        foreach (var (row, idx) in request.Rows!.Select((r, i) => (r, i)))
        {
            var rowNum = idx + 1;
            try
            {
                var name = GetRowString(row, "name");
                if (string.IsNullOrWhiteSpace(name))
                {
                    issues.Add(new ImportIssue(rowNum, "name", "Name is required", "error"));
                    continue;
                }

                var currency = GetRowString(row, "currency");
                var rowId = GetRowString(row, "id");

                if (!request.Preview)
                {
                    if (!string.IsNullOrEmpty(rowId) && Guid.TryParse(rowId, out var existingId))
                    {
                        var existing = await _bookRepo.GetByIdAsync(existingId);
                        if (existing != null && existing.OwnerId == userId)
                        {
                            var mainBook = await _bookRepo.GetMainBookAsync(userId);
                            if (mainBook != null && existing.Id == mainBook.Id)
                            {
                                // Skip Main book silently
                                continue;
                            }
                            existing.Update(name, currency);
                            await _bookRepo.UpdateAsync(existing);
                            updated++;
                            continue;
                        }
                    }

                    var book = new Book(name, userId, currency);
                    await _bookRepo.AddAsync(book);
                    created++;
                }
                else
                {
                    created++;
                }
            }
            catch (Exception ex)
            {
                issues.Add(new ImportIssue(rowNum, null, ex.Message, "error"));
            }
        }

        return new ImportResponse(new EntityImportResult(created, updated, deleted, issues.Count(i => i.Severity == "error"), issues.Count(i => i.Severity == "warning"), issues));
    }

    private async Task<ImportResponse> ImportBackupAsync(ImportRequest request, Guid userId)
    {
        if (request.Data == null)
            throw new DomainException("data field is required for backup entityType");

        var data = request.Data;

        if (!data.TryGetValue("version", out var versionObj) || versionObj is not JsonElement versionEl)
            throw new DomainException("Backup data is malformed: missing 'version'");

        if (versionEl.GetInt32() != 1)
            throw new DomainException($"Unsupported backup version: {versionEl.GetInt32()}. This app supports version 1.");

        if (!data.TryGetValue("books", out var booksObj) || booksObj is not JsonElement)
            throw new DomainException("Backup data is malformed: missing 'books' array");

        var bookIssues = new List<ImportIssue>();
        var catIssues = new List<ImportIssue>();
        var txIssues = new List<ImportIssue>();
        var jsonOpts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

        // Preview or process books
        int bCreated = 0, bUpdated = 0, bDeleted = 0;
        int cCreated = 0, cUpdated = 0, cDeleted = 0;
        int tCreated = 0, tUpdated = 0, tDeleted = 0;

        // Clear existing data, then process in order: books → categories → transactions
        if (!request.Preview)
        {
            // Fetch user's owned book IDs before deleting (we need them to delete transactions)
            var ownedBooks = await _bookRepo.GetByOwnerAsync(userId);
            var ownedBookIds = ownedBooks.Select(b => b.Id).ToList();

            // Clear in FK-safe order: transactions → categories → books
            await _transactionRepo.DeleteAllByBookIdsAsync(ownedBookIds);
            await _categoryRepo.DeleteAllByUserAsync(userId);
            await _bookRepo.DeleteAllByOwnerAsync(userId);

            var bookResult = await ProcessBackupBooksAsync(data, userId, bookIssues, jsonOpts);
            bCreated += bookResult.created; bUpdated += bookResult.updated;
            var catResult = await ProcessBackupCategoriesAsync(data, userId, catIssues, jsonOpts);
            cCreated += catResult.created; cUpdated += catResult.updated;
            var txResult = await ProcessBackupTransactionsAsync(data, userId, txIssues, jsonOpts);
            tCreated += txResult.created; tUpdated += txResult.updated;
        }

        return new ImportResponse(new BackupImportResult(
            new EntityImportResult(bCreated, bUpdated, bDeleted, bookIssues.Count(i => i.Severity == "error"), bookIssues.Count(i => i.Severity == "warning"), bookIssues),
            new EntityImportResult(cCreated, cUpdated, cDeleted, catIssues.Count(i => i.Severity == "error"), catIssues.Count(i => i.Severity == "warning"), catIssues),
            new EntityImportResult(tCreated, tUpdated, tDeleted, txIssues.Count(i => i.Severity == "error"), txIssues.Count(i => i.Severity == "warning"), txIssues)
        ));
    }

    private async Task<(int created, int updated)> ProcessBackupBooksAsync(Dictionary<string, object?> data, Guid userId, List<ImportIssue> issues, JsonSerializerOptions jsonOpts)
    {
        int created = 0, updated = 0;
        if (!data.TryGetValue("books", out var booksObj) || booksObj is not JsonElement booksEl) return (0, 0);
        foreach (var bookEl in booksEl.EnumerateArray())
        {
            try
            {
                var name = bookEl.GetProperty("name").GetString()!;
                var currency = bookEl.TryGetProperty("currency", out var curEl) ? curEl.GetString() : null;
                var idStr = bookEl.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;

                if (!string.IsNullOrEmpty(idStr) && Guid.TryParse(idStr, out var existingId))
                {
                    var existing = await _bookRepo.GetByIdAsync(existingId);
                    if (existing != null && existing.OwnerId == userId)
                    {
                        existing.Update(name, currency);
                        await _bookRepo.UpdateAsync(existing);
                        updated++;
                        continue;
                    }
                }

                var bookId = !string.IsNullOrEmpty(idStr) && Guid.TryParse(idStr, out var parsedId)
                    ? parsedId
                    : Guid.NewGuid();
                var book = Book.Restore(bookId, name, userId, currency);
                await _bookRepo.AddAsync(book);
                created++;
            }
            catch (Exception ex)
            {
                issues.Add(new ImportIssue(null, null, ex.Message, "error"));
            }
        }
        return (created, updated);
    }

    private async Task<(int created, int updated)> ProcessBackupCategoriesAsync(Dictionary<string, object?> data, Guid userId, List<ImportIssue> issues, JsonSerializerOptions jsonOpts)
    {
        int created = 0, updated = 0;
        if (!data.TryGetValue("categories", out var catsObj) || catsObj is not JsonElement catsEl) return (0, 0);
        foreach (var catEl in catsEl.EnumerateArray())
        {
            try
            {
                var name = catEl.GetProperty("name").GetString()!;
                var color = catEl.TryGetProperty("color", out var colEl) ? colEl.GetString() : null;
                var icon = catEl.TryGetProperty("icon", out var iconEl) ? iconEl.GetString() : null;
                var recurring = catEl.TryGetProperty("recurring", out var recEl) && recEl.GetBoolean();
                var idStr = catEl.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;

                if (!string.IsNullOrEmpty(idStr) && Guid.TryParse(idStr, out var existingId))
                {
                    var existing = await _categoryRepo.GetByIdAsync(existingId);
                    if (existing != null && existing.UserId == userId)
                    {
                        existing.Update(name, recurring, color, icon);
                        await _categoryRepo.UpdateAsync(existing);
                        updated++;
                        continue;
                    }
                }

                var maxOrder = await _categoryRepo.GetMaxOrderAsync(userId);
                var cat = new Category(name, userId, color, icon, maxOrder + 1, recurring);
                await _categoryRepo.AddAsync(cat);
                created++;
            }
            catch (Exception ex)
            {
                issues.Add(new ImportIssue(null, null, ex.Message, "error"));
            }
        }
        return (created, updated);
    }

    private async Task<(int created, int updated)> ProcessBackupTransactionsAsync(Dictionary<string, object?> data, Guid userId, List<ImportIssue> issues, JsonSerializerOptions jsonOpts)
    {
        int created = 0, updated = 0;
        if (!data.TryGetValue("transactions", out var txsObj) || txsObj is not JsonElement txsEl) return (0, 0);
        int row = 0;
        foreach (var txEl in txsEl.EnumerateArray())
        {
            row++;
            try
            {
                var bookIdStr = txEl.TryGetProperty("bookId", out var bidEl) ? bidEl.GetString() : null;
                if (string.IsNullOrEmpty(bookIdStr) || !Guid.TryParse(bookIdStr, out var bookId))
                {
                    issues.Add(new ImportIssue(row, "bookId", "Invalid bookId", "error"));
                    continue;
                }

                var visible = await _bookRepo.IsVisibleAsync(bookId, userId);
                if (!visible)
                {
                    issues.Add(new ImportIssue(row, "bookId", "Book not found or not visible", "error"));
                    continue;
                }

                var amount = txEl.TryGetProperty("amount", out var amtEl) ? amtEl.GetDecimal() : 0;
                var dateTimeStr = txEl.TryGetProperty("dateTime", out var dtEl) ? dtEl.GetString() : null;
                var dateTime = dateTimeStr != null && DateTimeOffset.TryParse(dateTimeStr, out var dt) ? dt : DateTimeOffset.UtcNow;

                var categoryName = txEl.TryGetProperty("categoryName", out var catEl) ? catEl.GetString() : null;
                var note = txEl.TryGetProperty("note", out var noteEl) ? noteEl.GetString() : null;
                var idStr = txEl.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;

                if (!string.IsNullOrEmpty(idStr) && Guid.TryParse(idStr, out var existingId))
                {
                    var existing = await _transactionRepo.GetByIdAsync(existingId);
                    if (existing != null)
                    {
                        existing.Update(dateTime, amount, null, null, null, categoryName, note);
                        await _transactionRepo.UpdateAsync(existing);
                        updated++;
                        continue;
                    }
                }

                var tx = new Transaction(bookId, userId, dateTime, amount, categoryName: categoryName, note: note);
                await _transactionRepo.AddAsync(tx);
                created++;
            }
            catch (Exception ex)
            {
                issues.Add(new ImportIssue(row, null, ex.Message, "error"));
            }
        }
        return (created, updated);
    }

    private static string? GetRowString(Dictionary<string, object?> row, string key)
    {
        if (row.TryGetValue(key, out var val) && val != null)
            return val.ToString();
        return null;
    }

    private static T? GetRowValue<T>(Dictionary<string, object?> row, string key) where T : struct
    {
        if (row.TryGetValue(key, out var val) && val != null)
        {
            if (val is T tv) return tv;
            if (val is JsonElement je)
            {
                try { return JsonSerializer.Deserialize<T>(je.GetRawText()); }
                catch { return null; }
            }
            try { return (T)Convert.ChangeType(val, typeof(T)); }
            catch { return null; }
        }
        return null;
    }
}
