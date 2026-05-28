using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Application.Services;
using ledger12.Domain;
using Moq;

namespace ledger12.Tests.Unit;

public class LedgerServiceTests
{
    private readonly Mock<ITransactionRepository> _repositoryMock;
    private readonly LedgerService _service;

    public LedgerServiceTests()
    {
        _repositoryMock = new Mock<ITransactionRepository>();
        _service = new LedgerService(_repositoryMock.Object);
    }

    [Fact]
    public async Task CreateTransactionAsync_ReturnsTransaction_WhenDtoIsValid()
    {
        // Arrange
        var dto = new CreateTransactionDto(
            Value: 100.50m,
            Category: "Food",
            Author: "Alice",
            Date: new DateTimeOffset(2025, 6, 1, 12, 0, 0, TimeSpan.Zero)
        );

        _repositoryMock
            .Setup(r => r.AddAsync(It.IsAny<Transaction>()))
            .ReturnsAsync((Transaction t) => t);

        // Act
        var result = await _service.CreateTransactionAsync(dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(dto.Value, result.Value);
        Assert.Equal(dto.Category, result.Category);
        Assert.Equal(dto.Author, result.Author);
        Assert.Equal(dto.Date, result.Date);
        Assert.NotEqual(Guid.Empty, result.Id);
    }

    [Fact]
    public async Task CreateTransactionAsync_DefaultsAuthorToCurrentUser_WhenAuthorNotProvided()
    {
        // Arrange
        var dto = new CreateTransactionDto(
            Value: 100m,
            Category: "Food",
            Author: null
        );

        _repositoryMock
            .Setup(r => r.AddAsync(It.IsAny<Transaction>()))
            .ReturnsAsync((Transaction t) => t);

        // Act
        var result = await _service.CreateTransactionAsync(dto, currentUser: "logged-in-user");

        // Assert
        Assert.Equal("logged-in-user", result.Author);
    }

    [Fact]
    public async Task CreateTransactionAsync_DefaultsDateToUtcNow_WhenDateNotProvided()
    {
        // Arrange
        var before = DateTimeOffset.UtcNow;
        var dto = new CreateTransactionDto(
            Value: 100m,
            Category: "Food",
            Author: "Alice",
            Date: null
        );

        _repositoryMock
            .Setup(r => r.AddAsync(It.IsAny<Transaction>()))
            .ReturnsAsync((Transaction t) => t);

        // Act
        var result = await _service.CreateTransactionAsync(dto);
        var after = DateTimeOffset.UtcNow;

        // Assert
        Assert.True(result.Date >= before && result.Date <= after,
            "Date should default to approximately UtcNow");
    }

    [Fact]
    public async Task CreateTransactionAsync_ThrowsArgumentException_WhenBothAuthorAndCurrentUserAreNull()
    {
        // Arrange
        var dto = new CreateTransactionDto(
            Value: 100m,
            Category: "Food",
            Author: null
        );

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ArgumentException>(
            () => _service.CreateTransactionAsync(dto, currentUser: null));

        Assert.Contains("Author", ex.Message, StringComparison.OrdinalIgnoreCase);
        _repositoryMock.Verify(r => r.AddAsync(It.IsAny<Transaction>()), Times.Never);
    }

    [Fact]
    public async Task CreateTransactionAsync_PrefersDtoAuthor_OverCurrentUser()
    {
        // Arrange
        var dto = new CreateTransactionDto(
            Value: 100m,
            Category: "Food",
            Author: "explicit-author"
        );

        _repositoryMock
            .Setup(r => r.AddAsync(It.IsAny<Transaction>()))
            .ReturnsAsync((Transaction t) => t);

        // Act
        var result = await _service.CreateTransactionAsync(dto, currentUser: "logged-in-user");

        // Assert
        Assert.Equal("explicit-author", result.Author);
    }

    [Fact]
    public async Task CreateTransactionAsync_CallsAddAsyncOnce_WhenDtoIsValid()
    {
        // Arrange
        var dto = new CreateTransactionDto(
            Value: 50m,
            Category: "Transport",
            Author: "Bob",
            Date: DateTimeOffset.UtcNow
        );

        _repositoryMock
            .Setup(r => r.AddAsync(It.IsAny<Transaction>()))
            .ReturnsAsync((Transaction t) => t);

        // Act
        await _service.CreateTransactionAsync(dto);

        // Assert
        _repositoryMock.Verify(
            r => r.AddAsync(It.IsAny<Transaction>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateTransactionAsync_ThrowsArgumentException_WhenValueIsZero()
    {
        // Arrange
        var dto = new CreateTransactionDto(
            Value: 0m,
            Category: "Food",
            Author: "Alice",
            Date: DateTimeOffset.UtcNow
        );

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ArgumentException>(
            () => _service.CreateTransactionAsync(dto));

        Assert.Contains("value", ex.Message, StringComparison.OrdinalIgnoreCase);
        _repositoryMock.Verify(r => r.AddAsync(It.IsAny<Transaction>()), Times.Never);
    }

    [Fact]
    public async Task CreateTransactionAsync_PropagatesRepositoryException_WhenAddAsyncFails()
    {
        // Arrange
        var dto = new CreateTransactionDto(
            Value: 100m,
            Category: "Food",
            Author: "Alice",
            Date: DateTimeOffset.UtcNow
        );

        var expectedException = new InvalidOperationException("Database connection failed");
        _repositoryMock
            .Setup(r => r.AddAsync(It.IsAny<Transaction>()))
            .ThrowsAsync(expectedException);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.CreateTransactionAsync(dto));

        Assert.Equal(expectedException.Message, ex.Message);
        _repositoryMock.Verify(r => r.AddAsync(It.IsAny<Transaction>()), Times.Once);
    }
}