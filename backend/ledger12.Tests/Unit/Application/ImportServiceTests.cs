using Moq;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Application.Services;
using ledger12.Domain.Entities;
using ledger12.Domain.Exceptions;

namespace ledger12.Tests.Unit.Application;

public class ImportServiceTests
{
    private readonly Mock<ITransactionRepository> _transactionRepo;
    private readonly Mock<ICategoryRepository> _categoryRepo;
    private readonly Mock<IBookRepository> _bookRepo;
    private readonly Mock<IUserRepository> _userRepo;
    private readonly ImportService _service;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _bookId = Guid.NewGuid();

    public ImportServiceTests()
    {
        _transactionRepo = new Mock<ITransactionRepository>();
        _categoryRepo = new Mock<ICategoryRepository>();
        _bookRepo = new Mock<IBookRepository>();
        _userRepo = new Mock<IUserRepository>();
        _service = new ImportService(_transactionRepo.Object, _categoryRepo.Object, _bookRepo.Object, _userRepo.Object);
    }

    [Fact]
    public async Task ImportAsync_ThrowsDomainException_WhenEntityTypeIsEmpty()
    {
        var request = new ImportRequest(true, "", null, null, null, null, null);
        await Assert.ThrowsAsync<DomainException>(() => _service.ImportAsync(request, _userId));
    }

    [Fact]
    public async Task ImportAsync_ThrowsDomainException_WhenEntityTypeIsUnknown()
    {
        var request = new ImportRequest(true, "widgets", null, null, null, null, null);
        await Assert.ThrowsAsync<DomainException>(() => _service.ImportAsync(request, _userId));
    }

    [Fact]
    public async Task ImportAsync_ThrowsDomainException_WhenRowsNullForNonBackup()
    {
        var request = new ImportRequest(true, "transactions", _bookId.ToString(), null, null, null, null);
        _bookRepo.Setup(r => r.HasEditAccessAsync(_bookId, _userId)).ReturnsAsync(true);

        await Assert.ThrowsAsync<DomainException>(() => _service.ImportAsync(request, _userId));
    }

    [Fact]
    public async Task ImportAsync_ThrowsDomainException_WhenBookIdMissingForTransactions()
    {
        var request = new ImportRequest(true, "transactions", null, null, null, new List<Dictionary<string, object?>>(), null);
        await Assert.ThrowsAsync<DomainException>(() => _service.ImportAsync(request, _userId));
    }

    [Fact]
    public async Task ImportTransactionsAsync_PreviewReturnsCreatedCount()
    {
        var rows = new List<Dictionary<string, object?>>
        {
            new() { ["amount"] = 100m, ["dateTime"] = "2025-06-01T12:00:00Z" },
            new() { ["amount"] = -50m, ["dateTime"] = "2025-06-02T12:00:00Z" },
        };
        var request = new ImportRequest(true, "transactions", _bookId.ToString(), null, null, rows, null);
        _bookRepo.Setup(r => r.HasEditAccessAsync(_bookId, _userId)).ReturnsAsync(true);

        var response = await _service.ImportAsync(request, _userId);
        var result = response.Data as EntityImportResult;

        Assert.NotNull(result);
        Assert.Equal(2, result.Created);
        Assert.Equal(0, result.Updated);
        _transactionRepo.Verify(r => r.AddAsync(It.IsAny<Transaction>()), Times.Never);
    }

    [Fact]
    public async Task ImportTransactionsAsync_CommitCreatesTransactions()
    {
        var rows = new List<Dictionary<string, object?>>
        {
            new() { ["amount"] = 100m, ["dateTime"] = "2025-06-01T12:00:00Z", ["categoryName"] = "Food" },
        };
        var request = new ImportRequest(false, "transactions", _bookId.ToString(), null, null, rows, null);
        _bookRepo.Setup(r => r.HasEditAccessAsync(_bookId, _userId)).ReturnsAsync(true);
        _transactionRepo.Setup(r => r.AddAsync(It.IsAny<Transaction>())).Returns(Task.CompletedTask);

        var response = await _service.ImportAsync(request, _userId);
        var result = response.Data as EntityImportResult;

        Assert.NotNull(result);
        Assert.Equal(1, result.Created);
        _transactionRepo.Verify(r => r.AddAsync(It.Is<Transaction>(t => t.Amount == 100m)), Times.Once);
    }

    [Fact]
    public async Task ImportTransactionsAsync_ReportsError_WhenAmountMissing()
    {
        var rows = new List<Dictionary<string, object?>>
        {
            new() { ["dateTime"] = "2025-06-01T12:00:00Z" },
        };
        var request = new ImportRequest(true, "transactions", _bookId.ToString(), null, null, rows, null);
        _bookRepo.Setup(r => r.HasEditAccessAsync(_bookId, _userId)).ReturnsAsync(true);

        var response = await _service.ImportAsync(request, _userId);
        var result = response.Data as EntityImportResult;

        Assert.NotNull(result);
        Assert.Equal(1, result.Errors);
        Assert.Single(result.Issues);
        Assert.Equal("amount", result.Issues[0].Field);
    }

    [Fact]
    public async Task ImportTransactionsAsync_ThrowsNotFoundException_WhenNoEditAccess()
    {
        _bookRepo.Setup(r => r.HasEditAccessAsync(_bookId, _userId)).ReturnsAsync(false);
        var request = new ImportRequest(true, "transactions", _bookId.ToString(), null, null, new List<Dictionary<string, object?>>(), null);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.ImportAsync(request, _userId));
    }

    [Fact]
    public async Task ImportCategoriesAsync_PreviewReturnsCreatedCount()
    {
        var rows = new List<Dictionary<string, object?>>
        {
            new() { ["name"] = "Food" },
            new() { ["name"] = "Transport" },
        };
        var request = new ImportRequest(true, "categories", null, null, null, rows, null);

        var response = await _service.ImportAsync(request, _userId);
        var result = response.Data as EntityImportResult;

        Assert.NotNull(result);
        Assert.Equal(2, result.Created);
    }

    [Fact]
    public async Task ImportCategoriesAsync_CommitCreatesCategories()
    {
        var rows = new List<Dictionary<string, object?>>
        {
            new() { ["name"] = "Food", ["color"] = "#ff0000" },
        };
        var request = new ImportRequest(false, "categories", null, null, null, rows, null);
        _categoryRepo.Setup(r => r.GetMaxOrderAsync(_userId)).ReturnsAsync(5);
        _categoryRepo.Setup(r => r.AddAsync(It.IsAny<Category>())).Returns(Task.CompletedTask);

        var response = await _service.ImportAsync(request, _userId);
        var result = response.Data as EntityImportResult;

        Assert.NotNull(result);
        Assert.Equal(1, result.Created);
        _categoryRepo.Verify(r => r.AddAsync(It.Is<Category>(c => c.Name == "Food" && c.Order == 6)), Times.Once);
    }

    [Fact]
    public async Task ImportCategoriesAsync_ReportsError_WhenNameMissing()
    {
        var rows = new List<Dictionary<string, object?>>
        {
            new() { ["color"] = "#ff0000" },
        };
        var request = new ImportRequest(true, "categories", null, null, null, rows, null);

        var response = await _service.ImportAsync(request, _userId);
        var result = response.Data as EntityImportResult;

        Assert.NotNull(result);
        Assert.Equal(1, result.Errors);
    }

    [Fact]
    public async Task ImportBooksAsync_PreviewReturnsCreatedCount()
    {
        var rows = new List<Dictionary<string, object?>>
        {
            new() { ["name"] = "Book1" },
        };
        var request = new ImportRequest(true, "books", null, null, null, rows, null);

        var response = await _service.ImportAsync(request, _userId);
        var result = response.Data as EntityImportResult;

        Assert.NotNull(result);
        Assert.Equal(1, result.Created);
    }

    [Fact]
    public async Task ImportBooksAsync_ReportsError_WhenNameMissing()
    {
        var rows = new List<Dictionary<string, object?>>
        {
            new() { ["currency"] = "EUR" },
        };
        var request = new ImportRequest(true, "books", null, null, null, rows, null);

        var response = await _service.ImportAsync(request, _userId);
        var result = response.Data as EntityImportResult;

        Assert.NotNull(result);
        Assert.Equal(1, result.Errors);
    }

    [Fact]
    public async Task ImportBackupAsync_ThrowsDomainException_WhenDataMissing()
    {
        var request = new ImportRequest(true, "backup", null, null, null, null, null);

        await Assert.ThrowsAsync<DomainException>(() => _service.ImportAsync(request, _userId));
    }

    [Fact]
    public async Task ImportBackupAsync_ThrowsDomainException_WhenVersionMissing()
    {
        var data = new Dictionary<string, object?> { ["books"] = new List<object>() };
        var request = new ImportRequest(true, "backup", null, null, null, null, data);

        await Assert.ThrowsAsync<DomainException>(() => _service.ImportAsync(request, _userId));
    }

    [Fact]
    public async Task ImportBackupAsync_ThrowsDomainException_WhenUnsupportedVersion()
    {
        var dict = new Dictionary<string, object?>
        {
            ["version"] = System.Text.Json.JsonDocument.Parse("2").RootElement,
            ["books"] = System.Text.Json.JsonDocument.Parse("[]").RootElement
        };
        var request = new ImportRequest(true, "backup", null, null, null, null, dict);

        await Assert.ThrowsAsync<DomainException>(() => _service.ImportAsync(request, _userId));
    }

    [Fact]
    public async Task ImportTransactionsAsync_CreatesTransactions_WithCorrectDateCategoryAndAmount_FromCsvData()
    {
        // Arrange — JSON string matching what the frontend sends.
        // Columns: Id,DateUTC,Value,ExchangeRate,Currency,Category,Notes,User
        // Value is the original-currency amount (BGN); amount is Value * ExchangeRate (EUR).
        // We deserialize through System.Text.Json so values arrive as JsonElement
        // (the real deserialization path), not as native .NET types.
        var json = """
        [
            {
                "id": "4",
                "dateTime": "2025-05-12T10:37:57Z",
                "amount": 2.04,
                "originalCurrency": "BGN",
                "originalAmount": 4.00,
                "exchangeRate": 0.51,
                "categoryName": "Groceries",
                "note": null
            },
            {
                "id": "5",
                "dateTime": "2025-05-12T11:27:59Z",
                "amount": 2.5347,
                "originalCurrency": "BGN",
                "originalAmount": 4.97,
                "exchangeRate": 0.51,
                "categoryName": "Groceries",
                "note": null
            },
            {
                "id": "10",
                "dateTime": "2025-05-13T09:06:20Z",
                "amount": 9.333,
                "originalCurrency": "BGN",
                "originalAmount": 18.30,
                "exchangeRate": 0.51,
                "categoryName": "Groceries",
                "note": null
            },
            {
                "id": "12",
                "dateTime": "2025-05-13T13:07:44Z",
                "amount": 0.612,
                "originalCurrency": "BGN",
                "originalAmount": 1.20,
                "exchangeRate": 0.51,
                "categoryName": "Groceries",
                "note": null
            },
            {
                "id": "13",
                "dateTime": "2025-05-13T13:23:29Z",
                "amount": 11.1537,
                "originalCurrency": "BGN",
                "originalAmount": 21.87,
                "exchangeRate": 0.51,
                "categoryName": "Pets",
                "note": null
            },
            {
                "id": "15",
                "dateTime": "2025-05-13T14:14:42Z",
                "amount": 10.455,
                "originalCurrency": "BGN",
                "originalAmount": 20.50,
                "exchangeRate": 0.51,
                "categoryName": "Groceries",
                "note": null
            }
        ]
        """;

        var rows = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(json)!;

        var request = new ImportRequest(false, "transactions", _bookId.ToString(), null, null, rows, null);
        _bookRepo.Setup(r => r.HasEditAccessAsync(_bookId, _userId)).ReturnsAsync(true);
        _transactionRepo.Setup(r => r.AddAsync(It.IsAny<Transaction>())).Returns(Task.CompletedTask);

        // Act
        var response = await _service.ImportAsync(request, _userId);
        var result = response.Data as EntityImportResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(6, result.Created);
        Assert.Equal(0, result.Errors);
        Assert.Equal(0, result.Warnings);

        // Row 1: 2025-05-12, Groceries, 2.04 EUR (4.00 BGN × 0.51)
        _transactionRepo.Verify(r => r.AddAsync(It.Is<Transaction>(t =>
            t.DateTime == DateTimeOffset.Parse("2025-05-12T10:37:57Z") &&
            t.CategoryName == "Groceries" &&
            t.Amount == 2.04m &&
            t.OriginalCurrency == "BGN" &&
            t.OriginalAmount == 4.00m &&
            t.ExchangeRate == 0.51m
        )), Times.Once);

        // Row 5: 2025-05-13, Pets, 11.1537 EUR (21.87 BGN × 0.51)
        _transactionRepo.Verify(r => r.AddAsync(It.Is<Transaction>(t =>
            t.DateTime == DateTimeOffset.Parse("2025-05-13T13:23:29Z") &&
            t.CategoryName == "Pets" &&
            t.Amount == 11.1537m &&
            t.OriginalCurrency == "BGN" &&
            t.OriginalAmount == 21.87m &&
            t.ExchangeRate == 0.51m
        )), Times.Once);

        // All 6 AddAsync calls
        _transactionRepo.Verify(r => r.AddAsync(It.IsAny<Transaction>()), Times.Exactly(6));
    }
}
