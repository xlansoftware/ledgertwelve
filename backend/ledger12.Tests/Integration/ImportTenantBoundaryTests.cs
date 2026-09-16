using Microsoft.EntityFrameworkCore;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Application.Services;
using ledger12.Domain.Entities;
using ledger12.Domain.Enums;
using ledger12.Infrastructure.Data;
using ledger12.Infrastructure.Repositories;
using Microsoft.Extensions.Logging.Abstractions;

namespace ledger12.Tests.Integration;

public class ImportTenantBoundaryTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly ImportService _importService;
    private readonly IBookRepository _bookRepo;
    private readonly ITransactionRepository _transactionRepo;
    private readonly ICategoryRepository _categoryRepo;

    private readonly Guid _userA = Guid.NewGuid();
    private readonly Guid _userB = Guid.NewGuid();

    private readonly Book _bookA;
    private readonly Book _bookB;
    private readonly Book _sharedViewBookA;
    private readonly Book _sharedEditBookA;

    public ImportTenantBoundaryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"ImportTenantBoundaryTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new AppDbContext(options);
        _bookRepo = new BookRepository(_context);
        _transactionRepo = new TransactionRepository(_context);
        _categoryRepo = new CategoryRepository(_context);
        var userRepo = new UserRepository(_context);
        _importService = new ImportService(_transactionRepo, _categoryRepo, _bookRepo, userRepo, NullLogger<ImportService>.Instance);

        _bookA = new Book("A Main", _userA, "USD");
        _bookB = new Book("B Main", _userB, "EUR");
        _sharedViewBookA = new Book("A View", _userA, "USD");
        _sharedEditBookA = new Book("A Edit", _userA, "USD");
        _sharedViewBookA.Shares.Add(new BookShare(_sharedViewBookA.Id, _userB, BookPermission.View));
        _sharedEditBookA.Shares.Add(new BookShare(_sharedEditBookA.Id, _userB, BookPermission.Edit));

        _context.Books.AddRange(_bookA, _bookB, _sharedViewBookA, _sharedEditBookA);
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    private static Dictionary<string, object?> BuildBackupData(string books, string categories, string transactions)
    {
        return new Dictionary<string, object?>
        {
            ["version"] = System.Text.Json.JsonDocument.Parse("1").RootElement,
            ["books"] = System.Text.Json.JsonDocument.Parse(books).RootElement,
            ["categories"] = System.Text.Json.JsonDocument.Parse(categories).RootElement,
            ["transactions"] = System.Text.Json.JsonDocument.Parse(transactions).RootElement,
        };
    }

    [Fact]
    public async Task ImportTransactionsAsync_RejectsCrossTenantInsert_WhenRowBookIdIsNotEditable()
    {
        // Arrange — the caller owns _bookB but a row targets _bookA, owned by another user.
        var rows = new List<Dictionary<string, object?>>
        {
            new() { ["amount"] = 42m, ["bookId"] = _bookA.Id.ToString() },
        };
        var request = new ImportRequest(false, "transactions", _bookB.Id.ToString(), null, null, rows, null);

        // Act
        var response = await _importService.ImportAsync(request, _userB);
        var result = response.Data as EntityImportResult;

        // Assert — the row is rejected and nothing is written to either book.
        Assert.NotNull(result);
        Assert.Equal(1, result.Errors);
        Assert.Equal(0, result.Created);
        Assert.Equal(0, result.Updated);
        Assert.Equal("bookId", result.Issues[0].Field);
        Assert.Empty(await _transactionRepo.SearchAsync(bookId: _bookA.Id, pageSize: 100));
        Assert.Empty(await _transactionRepo.SearchAsync(bookId: _bookB.Id, pageSize: 100));
    }

    [Fact]
    public async Task ImportTransactionsAsync_RejectsCrossTenantUpsert_AndLeavesTransactionUnchanged()
    {
        // Arrange — an existing transaction lives in _bookA, which the caller cannot edit.
        var existing = new Transaction(_bookA.Id, _userA, DateTimeOffset.UtcNow, -30m, categoryName: "Food", note: "original");
        await _transactionRepo.AddAsync(existing);

        var rows = new List<Dictionary<string, object?>>
        {
            new() { ["amount"] = 999m, ["id"] = existing.Id.ToString(), ["note"] = "hijacked" },
        };
        var request = new ImportRequest(false, "transactions", _bookB.Id.ToString(), null, null, rows, null);

        // Act
        var response = await _importService.ImportAsync(request, _userB);
        var result = response.Data as EntityImportResult;

        // Assert — the upsert is rejected and the transaction is untouched.
        Assert.NotNull(result);
        Assert.Equal(1, result.Errors);
        Assert.Equal(0, result.Updated);
        Assert.Equal("id", result.Issues[0].Field);

        var unchanged = await _transactionRepo.GetByIdAsync(existing.Id);
        Assert.NotNull(unchanged);
        Assert.Equal(-30m, unchanged!.Amount);
        Assert.Equal("original", unchanged.Note);
    }

    [Fact]
    public async Task ImportTransactionsAsync_Succeeds_WhenRowBookIsOwnedOrSharedWithEdit()
    {
        // Arrange — one row targets the caller's own book, one an edit-shared book.
        var rows = new List<Dictionary<string, object?>>
        {
            new() { ["amount"] = 10m, ["bookId"] = _bookB.Id.ToString() },
            new() { ["amount"] = 20m, ["bookId"] = _sharedEditBookA.Id.ToString() },
        };
        var request = new ImportRequest(false, "transactions", _bookB.Id.ToString(), null, null, rows, null);

        // Act
        var response = await _importService.ImportAsync(request, _userB);
        var result = response.Data as EntityImportResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(0, result.Errors);
        Assert.Equal(2, result.Created);
        Assert.Single(await _transactionRepo.SearchAsync(bookId: _bookB.Id, pageSize: 100));
        Assert.Single(await _transactionRepo.SearchAsync(bookId: _sharedEditBookA.Id, pageSize: 100));
    }

    [Fact]
    public async Task ImportBackupAsync_RejectsTransactionIntoViewOnlySharedBook()
    {
        // Arrange — the caller has view-only access to _sharedViewBookA.
        var data = BuildBackupData("[]", "[]", $"[{{\"bookId\": \"{_sharedViewBookA.Id}\", \"amount\": 10}}]");
        var request = new ImportRequest(false, "backup", null, null, null, null, data);

        // Act
        var response = await _importService.ImportAsync(request, _userB);
        var result = response.Data as BackupImportResult;

        // Assert — the transaction is skipped and the book is left untouched.
        Assert.NotNull(result);
        Assert.Equal(1, result.Transactions.Errors);
        Assert.Equal("bookId", result.Transactions.Issues[0].Field);
        Assert.Empty(await _transactionRepo.SearchAsync(bookId: _sharedViewBookA.Id, pageSize: 100));
    }
}
