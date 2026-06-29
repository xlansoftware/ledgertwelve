using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Application.Services;
using ledger12.Domain.Entities;
using ledger12.Domain.Enums;
using ledger12.Infrastructure.Data;
using ledger12.Infrastructure.Repositories;

namespace ledger12.Tests.Integration;

public class ImportBackupTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly ImportService _importService;
    private readonly IBookRepository _bookRepo;
    private readonly ITransactionRepository _transactionRepo;
    private readonly ICategoryRepository _categoryRepo;
    private readonly Guid _userId = Guid.NewGuid();

    public ImportBackupTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"ImportBackupTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new AppDbContext(options);
        _bookRepo = new BookRepository(_context);
        _transactionRepo = new TransactionRepository(_context);
        _categoryRepo = new CategoryRepository(_context);
        var userRepo = new UserRepository(_context);
        _importService = new ImportService(_transactionRepo, _categoryRepo, _bookRepo, userRepo);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    /// <summary>
    /// Parses the backup JSON file into a Dictionary&lt;string, object?&gt; where
    /// all nested values are JsonElement — matching what the API deserialization produces.
    /// </summary>
    private static Dictionary<string, object?> ParseBackupJson(string jsonPath)
    {
        var json = File.ReadAllText(jsonPath);
        using var doc = JsonDocument.Parse(json);
        var dict = new Dictionary<string, object?>();
        foreach (var prop in doc.RootElement.EnumerateObject())
        {
            dict[prop.Name] = prop.Value.Clone();
        }
        return dict;
    }

    /// <summary>
    /// Seeds the database with pre-existing books, categories, and transactions
    /// that should be cleared by a backup import.
    /// </summary>
    private async Task SeedExistingDataAsync()
    {
        var oldBook1 = new Book("OldBook1", _userId, "USD");
        var oldBook2 = new Book("OldBook2", _userId, "EUR");
        await _bookRepo.AddAsync(oldBook1);
        await _bookRepo.AddAsync(oldBook2);

        var oldCat1 = new Category("OldCat1", _userId, "#ff0000", "star", 1);
        var oldCat2 = new Category("OldCat2", _userId, "#00ff00", "heart", 2);
        var oldCat3 = new Category("OldCat3", _userId, "#0000ff", "circle", 3);
        await _categoryRepo.AddAsync(oldCat1);
        await _categoryRepo.AddAsync(oldCat2);
        await _categoryRepo.AddAsync(oldCat3);

        var oldTx1 = new Transaction(oldBook1.Id, _userId, DateTimeOffset.UtcNow, -50, categoryName: "OldCat1", note: "Old tx 1");
        var oldTx2 = new Transaction(oldBook1.Id, _userId, DateTimeOffset.UtcNow, -25, categoryName: "OldCat2", note: "Old tx 2");
        await _transactionRepo.AddAsync(oldTx1);
        await _transactionRepo.AddAsync(oldTx2);
    }

    private Dictionary<string, object?> LoadBackupData()
    {
        var jsonPath = Path.GetFullPath(
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "import-data", "backup-2026-06-29.json"));
        return ParseBackupJson(jsonPath);
    }

    [Fact]
    public async Task ImportBackupAsync_CreatesBooksAndTransactions_FromBackupFile()
    {
        // Arrange — load the test backup JSON file
        var data = LoadBackupData();

        var request = new ImportRequest(
            Preview: false,
            EntityType: "backup",
            BookId: null,
            ClearExisting: null,
            Mapping: null,
            Rows: null,
            Data: data
        );

        // Act
        var response = await _importService.ImportAsync(request, _userId);
        var result = response.Data as BackupImportResult;

        // Assert — result metadata
        Assert.NotNull(result);
        Assert.Equal(4, result.Books.Created);
        Assert.Equal(22, result.Categories.Created);
        Assert.True(result.Transactions.Created > 0);

        // Assert — books are persisted and accessible via the book repository
        var books = await _bookRepo.GetByOwnerAsync(_userId);
        Assert.Equal(4, books.Count);

        var mainBook = books.FirstOrDefault(b => b.Name == "Main");
        Assert.NotNull(mainBook);
        Assert.Equal("EUR", mainBook!.Currency);
        Assert.Equal(BookStatus.Open, mainBook.Status);

        Assert.Contains(books, b => b.Name == "Море 2025");
        Assert.Contains(books, b => b.Name == "Greece 2025");
        Assert.Contains(books, b => b.Name == "Swiss 2026");

        // Assert — books from backup retain their original status
        var moreBook = books.First(b => b.Name == "Море 2025");
        var greeceBook = books.First(b => b.Name == "Greece 2025");
        var swissBook = books.First(b => b.Name == "Swiss 2026");
        Assert.Equal(BookStatus.Closed, moreBook.Status);
        Assert.Equal(BookStatus.Closed, greeceBook.Status);
        Assert.Equal(BookStatus.Closed, swissBook.Status);

        // Assert — transactions are persisted (Main book has the most)
        var transactions = await _transactionRepo.SearchAsync(bookId: mainBook.Id, pageSize: 5000);
        Assert.NotEmpty(transactions);
        Assert.True(transactions.Count > 100);

        // Assert — transactions exist in other books too
        var greeceTransactions = await _transactionRepo.SearchAsync(bookId: greeceBook.Id, pageSize: 100);
        Assert.NotEmpty(greeceTransactions);

        var moreTransactions = await _transactionRepo.SearchAsync(bookId: moreBook.Id, pageSize: 100);
        Assert.NotEmpty(moreTransactions);

        // Assert — categories are persisted
        var categories = await _categoryRepo.GetByUserAsync(_userId);
        Assert.Equal(22, categories.Count);
        Assert.Contains(categories, c => c.Name == "Groceries");
        Assert.Contains(categories, c => c.Name == "Dining Out");
        Assert.Contains(categories, c => c.Name == "Transportation");
        Assert.Contains(categories, c => c.Name == "Savings");
    }

    [Fact]
    public async Task ImportBackupAsync_ClearsExistingData_AndImportsBackup()
    {
        // Arrange — seed pre-existing data
        await SeedExistingDataAsync();

        // Verify seed data is present
        var seedBooks = await _bookRepo.GetByOwnerAsync(_userId);
        Assert.Equal(2, seedBooks.Count);
        var seedCats = await _categoryRepo.GetByUserAsync(_userId);
        Assert.Equal(3, seedCats.Count);
        var seedTx = await _transactionRepo.SearchAsync(bookId: seedBooks[0].Id, pageSize: 100);
        Assert.NotEmpty(seedTx);

        var data = LoadBackupData();
        var request = new ImportRequest(
            Preview: false,
            EntityType: "backup",
            BookId: null,
            ClearExisting: null,
            Mapping: null,
            Rows: null,
            Data: data
        );

        // Act
        var response = await _importService.ImportAsync(request, _userId);
        var result = response.Data as BackupImportResult;

        // Assert — result metadata
        Assert.NotNull(result);
        Assert.Equal(4, result.Books.Created);
        Assert.Equal(22, result.Categories.Created);
        Assert.True(result.Transactions.Created > 0);

        // Assert — old data is gone
        var books = await _bookRepo.GetByOwnerAsync(_userId);
        Assert.DoesNotContain(books, b => b.Name == "OldBook1");
        Assert.DoesNotContain(books, b => b.Name == "OldBook2");

        var categories = await _categoryRepo.GetByUserAsync(_userId);
        Assert.DoesNotContain(categories, c => c.Name == "OldCat1");
        Assert.DoesNotContain(categories, c => c.Name == "OldCat2");
        Assert.DoesNotContain(categories, c => c.Name == "OldCat3");

        // Assert — only backup data exists
        Assert.Equal(4, books.Count);
        Assert.Equal(22, categories.Count);
        Assert.Contains(books, b => b.Name == "Main");
        Assert.Contains(categories, c => c.Name == "Groceries");

        // Assert — closed books retain their status
        var closedBooks = books.Where(b => b.Status == BookStatus.Closed).ToList();
        Assert.Equal(3, closedBooks.Count);
        Assert.Contains(closedBooks, b => b.Name == "Море 2025");
        Assert.Contains(closedBooks, b => b.Name == "Greece 2025");
        Assert.Contains(closedBooks, b => b.Name == "Swiss 2026");
        var mainBook2 = books.First(b => b.Name == "Main");
        Assert.Equal(BookStatus.Open, mainBook2.Status);
    }

    [Fact]
    public async Task ImportBackupAsync_CanBeImportedTwice_NoUniqueConstraintViolations()
    {
        // Arrange — seed pre-existing data
        await SeedExistingDataAsync();

        var data = LoadBackupData();
        var request = new ImportRequest(
            Preview: false,
            EntityType: "backup",
            BookId: null,
            ClearExisting: null,
            Mapping: null,
            Rows: null,
            Data: data
        );

        // Act — first import
        var response1 = await _importService.ImportAsync(request, _userId);
        var result1 = response1.Data as BackupImportResult;

        Assert.NotNull(result1);
        Assert.Equal(4, result1.Books.Created);
        Assert.Equal(22, result1.Categories.Created);

        // Act — second import of the same file
        var response2 = await _importService.ImportAsync(request, _userId);
        var result2 = response2.Data as BackupImportResult;

        // Assert — second import also succeeds (all entities are re-created from scratch)
        Assert.NotNull(result2);
        Assert.Equal(4, result2.Books.Created);
        Assert.Equal(22, result2.Categories.Created);
        Assert.True(result2.Transactions.Created > 0);

        // Assert — final state is identical to a single import
        var books = await _bookRepo.GetByOwnerAsync(_userId);
        Assert.Equal(4, books.Count);

        // Assert — book status is preserved across multiple imports
        Assert.Contains(books, b => b.Name == "Море 2025" && b.Status == BookStatus.Closed);
        Assert.Contains(books, b => b.Name == "Greece 2025" && b.Status == BookStatus.Closed);
        Assert.Contains(books, b => b.Name == "Swiss 2026" && b.Status == BookStatus.Closed);
        var mainBook3 = books.First(b => b.Name == "Main");
        Assert.Equal(BookStatus.Open, mainBook3.Status);

        var categories = await _categoryRepo.GetByUserAsync(_userId);
        Assert.Equal(22, categories.Count);

        var mainBook = books.First(b => b.Name == "Main");
        var transactions = await _transactionRepo.SearchAsync(bookId: mainBook.Id, pageSize: 5000);
        Assert.NotEmpty(transactions);
        Assert.True(transactions.Count > 100);

        // Assert — all backup categories exist (no unique key violations)
        Assert.Contains(categories, c => c.Name == "Groceries");
        Assert.Contains(categories, c => c.Name == "Dining Out");
        Assert.Contains(categories, c => c.Name == "Transportation");
        Assert.Contains(categories, c => c.Name == "Savings");
        Assert.Contains(categories, c => c.Name == "Rent / Mortgage");
        Assert.Contains(categories, c => c.Name == "Utilities");
    }

    [Fact]
    public async Task ImportBackupAsync_Preview_DoesNotPersistData()
    {
        // Arrange
        var data = LoadBackupData();

        var request = new ImportRequest(
            Preview: true,
            EntityType: "backup",
            BookId: null,
            ClearExisting: null,
            Mapping: null,
            Rows: null,
            Data: data
        );

        // Act
        var response = await _importService.ImportAsync(request, _userId);
        var result = response.Data as BackupImportResult;

        // Assert — preview returns zero counts (backup path doesn't count in preview)
        Assert.NotNull(result);
        Assert.Equal(0, result.Books.Created);
        Assert.Equal(0, result.Categories.Created);
        Assert.Equal(0, result.Transactions.Created);

        // Assert — nothing was persisted
        var books = await _bookRepo.GetByOwnerAsync(_userId);
        Assert.Empty(books);

        var categories = await _categoryRepo.GetByUserAsync(_userId);
        Assert.Empty(categories);
    }

    [Fact]
    public async Task ImportBackupAsync_Preview_DoesNotClearExistingData()
    {
        // Arrange — seed pre-existing data
        await SeedExistingDataAsync();

        var data = LoadBackupData();
        var request = new ImportRequest(
            Preview: true,
            EntityType: "backup",
            BookId: null,
            ClearExisting: null,
            Mapping: null,
            Rows: null,
            Data: data
        );

        // Act
        var response = await _importService.ImportAsync(request, _userId);
        var result = response.Data as BackupImportResult;

        // Assert — preview returns zero counts
        Assert.NotNull(result);
        Assert.Equal(0, result.Books.Created);
        Assert.Equal(0, result.Categories.Created);
        Assert.Equal(0, result.Transactions.Created);

        // Assert — existing data is NOT cleared during preview
        var books = await _bookRepo.GetByOwnerAsync(_userId);
        Assert.Equal(2, books.Count);
        Assert.Contains(books, b => b.Name == "OldBook1");
        Assert.Contains(books, b => b.Name == "OldBook2");

        var categories = await _categoryRepo.GetByUserAsync(_userId);
        Assert.Equal(3, categories.Count);
        Assert.Contains(categories, c => c.Name == "OldCat1");
    }
}
