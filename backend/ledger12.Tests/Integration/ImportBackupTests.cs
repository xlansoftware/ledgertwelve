using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Application.Services;
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

    [Fact]
    public async Task ImportBackupAsync_CreatesBooksAndTransactions_FromBackupFile()
    {
        // Arrange — load the test backup JSON file
        var jsonPath = Path.GetFullPath(
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "import-data", "backup-2026-06-29.json"));
        var data = ParseBackupJson(jsonPath);

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

        Assert.Contains(books, b => b.Name == "Море 2025");
        Assert.Contains(books, b => b.Name == "Greece 2025");
        Assert.Contains(books, b => b.Name == "Swiss 2026");

        // Assert — transactions are persisted (Main book has the most)
        var transactions = await _transactionRepo.SearchAsync(bookId: mainBook.Id, pageSize: 5000);
        Assert.NotEmpty(transactions);
        Assert.True(transactions.Count > 100);

        // Assert — transactions exist in other books too
        var greeceBook = books.First(b => b.Name == "Greece 2025");
        var greeceTransactions = await _transactionRepo.SearchAsync(bookId: greeceBook.Id, pageSize: 100);
        Assert.NotEmpty(greeceTransactions);

        var moreBook = books.First(b => b.Name == "Море 2025");
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
    public async Task ImportBackupAsync_Preview_DoesNotPersistData()
    {
        // Arrange
        var jsonPath = Path.GetFullPath(
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "import-data", "backup-2026-06-29.json"));
        var data = ParseBackupJson(jsonPath);

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
}
