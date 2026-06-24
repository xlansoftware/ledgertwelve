using Moq;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Application.Services;
using ledger12.Domain.Entities;
using ledger12.Domain.Exceptions;

namespace ledger12.Tests.Unit.Application;

public class TransactionServiceTests
{
    private readonly Mock<ITransactionRepository> _transactionRepo;
    private readonly Mock<IBookRepository> _bookRepo;
    private readonly TransactionService _service;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _bookId = Guid.NewGuid();

    public TransactionServiceTests()
    {
        _transactionRepo = new Mock<ITransactionRepository>();
        _bookRepo = new Mock<IBookRepository>();
        _service = new TransactionService(_transactionRepo.Object, _bookRepo.Object);
    }

    [Fact]
    public async Task SearchAsync_ReturnsPagedResponse_WhenFiltersApplied()
    {
        var transactions = new List<Transaction>
        {
            new(_bookId, _userId, DateTimeOffset.UtcNow, 100m),
            new(_bookId, _userId, DateTimeOffset.UtcNow, -50m)
        };
        _bookRepo.Setup(r => r.IsVisibleAsync(_bookId, _userId)).ReturnsAsync(true);
        _transactionRepo.Setup(r => r.SearchAsync(_bookId, null, null, null, null, null, null, null, 1, 20))
            .ReturnsAsync(transactions);
        _transactionRepo.Setup(r => r.GetSearchCountAsync(_bookId, null, null, null, null, null, null, null))
            .ReturnsAsync(2);

        var result = await _service.SearchAsync(_bookId, null, null, null, null, null, null, null, 1, 20, _userId);

        Assert.Equal(2, result.Data.Count);
        Assert.Equal(1, result.Meta.Page);
        Assert.Equal(20, result.Meta.PageSize);
        Assert.Equal(2, result.Meta.Total);
    }

    [Fact]
    public async Task SearchAsync_ThrowsNotFoundException_WhenBookNotVisible()
    {
        _bookRepo.Setup(r => r.IsVisibleAsync(It.IsAny<Guid>(), _userId)).ReturnsAsync(false);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _service.SearchAsync(Guid.NewGuid(), null, null, null, null, null, null, null, 1, 20, _userId));
    }

    [Fact]
    public async Task SearchAsync_WorksWithoutBookId()
    {
        _transactionRepo.Setup(r => r.SearchAsync(null, null, null, null, null, null, null, null, 1, 20))
            .ReturnsAsync(new List<Transaction>());
        _transactionRepo.Setup(r => r.GetSearchCountAsync(null, null, null, null, null, null, null))
            .ReturnsAsync(0);

        var result = await _service.SearchAsync(null, null, null, null, null, null, null, null, 1, 20, _userId);

        Assert.Empty(result.Data);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsDto_WhenTransactionExistsAndVisible()
    {
        var txId = Guid.NewGuid();
        var tx = new Transaction(_bookId, _userId, DateTimeOffset.UtcNow, 100m);
        _transactionRepo.Setup(r => r.GetByIdAsync(txId)).ReturnsAsync(tx);
        _bookRepo.Setup(r => r.IsVisibleAsync(tx.BookId, _userId)).ReturnsAsync(true);

        var result = await _service.GetByIdAsync(txId, _userId);

        Assert.NotNull(result);
        Assert.Equal(tx.Id.ToString(), result.Id);
    }

    [Fact]
    public async Task GetByIdAsync_ThrowsNotFoundException_WhenTransactionNotFound()
    {
        _transactionRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((Transaction?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetByIdAsync(Guid.NewGuid(), _userId));
    }

    [Fact]
    public async Task GetByIdAsync_ThrowsNotFoundException_WhenBookNotVisible()
    {
        var tx = new Transaction(_bookId, _userId, DateTimeOffset.UtcNow, 100m);
        _transactionRepo.Setup(r => r.GetByIdAsync(tx.Id)).ReturnsAsync(tx);
        _bookRepo.Setup(r => r.IsVisibleAsync(tx.BookId, _userId)).ReturnsAsync(false);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetByIdAsync(tx.Id, _userId));
    }

    [Fact]
    public async Task CreateAsync_ReturnsDto_WhenUserHasEditAccess()
    {
        var request = new CreateTransactionRequest(_bookId, DateTimeOffset.UtcNow, 100m, null, null, null, null, null);
        _bookRepo.Setup(r => r.HasEditAccessAsync(_bookId, _userId)).ReturnsAsync(true);
        _transactionRepo.Setup(r => r.AddAsync(It.IsAny<Transaction>())).Returns(Task.CompletedTask);

        var result = await _service.CreateAsync(request, _userId);

        Assert.NotNull(result);
        Assert.Equal(_bookId.ToString(), result.BookId);
        _transactionRepo.Verify(r => r.AddAsync(It.IsAny<Transaction>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_ThrowsNotFoundException_WhenNoEditAccess()
    {
        var request = new CreateTransactionRequest(_bookId, DateTimeOffset.UtcNow, 100m, null, null, null, null, null);
        _bookRepo.Setup(r => r.HasEditAccessAsync(_bookId, _userId)).ReturnsAsync(false);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.CreateAsync(request, _userId));
    }

    [Fact]
    public async Task UpdateAsync_ReturnsDto_WhenTransactionExistsAndEditable()
    {
        var txId = Guid.NewGuid();
        var tx = new Transaction(_bookId, _userId, DateTimeOffset.UtcNow, 100m);
        _transactionRepo.Setup(r => r.GetByIdAsync(txId)).ReturnsAsync(tx);
        _bookRepo.Setup(r => r.HasEditAccessAsync(_bookId, _userId)).ReturnsAsync(true);
        _transactionRepo.Setup(r => r.UpdateAsync(It.IsAny<Transaction>())).Returns(Task.CompletedTask);

        var request = new UpdateTransactionRequest(DateTimeOffset.UtcNow, 200m, null, null, null, null, null);
        var result = await _service.UpdateAsync(txId, request, _userId);

        Assert.NotNull(result);
        _transactionRepo.Verify(r => r.UpdateAsync(It.IsAny<Transaction>()), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_ThrowsNotFoundException_WhenTransactionNotFound()
    {
        _transactionRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((Transaction?)null);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _service.UpdateAsync(Guid.NewGuid(), new UpdateTransactionRequest(DateTimeOffset.UtcNow, 200m, null, null, null, null, null), _userId));
    }

    [Fact]
    public async Task UpdateAsync_ThrowsNotFoundException_WhenNoEditAccess()
    {
        var txId = Guid.NewGuid();
        var tx = new Transaction(_bookId, Guid.NewGuid(), DateTimeOffset.UtcNow, 100m);
        _transactionRepo.Setup(r => r.GetByIdAsync(txId)).ReturnsAsync(tx);
        _bookRepo.Setup(r => r.HasEditAccessAsync(_bookId, _userId)).ReturnsAsync(false);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _service.UpdateAsync(txId, new UpdateTransactionRequest(DateTimeOffset.UtcNow, 200m, null, null, null, null, null), _userId));
    }

    [Fact]
    public async Task DeleteAsync_ReturnsResponse_WhenTransactionExistsAndEditable()
    {
        var txId = Guid.NewGuid();
        var tx = new Transaction(_bookId, _userId, DateTimeOffset.UtcNow, 100m);
        _transactionRepo.Setup(r => r.GetByIdAsync(txId)).ReturnsAsync(tx);
        _bookRepo.Setup(r => r.HasEditAccessAsync(_bookId, _userId)).ReturnsAsync(true);
        _transactionRepo.Setup(r => r.DeleteAsync(It.IsAny<Transaction>())).Returns(Task.CompletedTask);

        var result = await _service.DeleteAsync(txId, _userId);

        Assert.True(result.Deleted);
        _transactionRepo.Verify(r => r.DeleteAsync(tx), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_ThrowsNotFoundException_WhenTransactionNotFound()
    {
        _transactionRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((Transaction?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.DeleteAsync(Guid.NewGuid(), _userId));
    }

    [Fact]
    public async Task DeleteAsync_ThrowsNotFoundException_WhenNoEditAccess()
    {
        var txId = Guid.NewGuid();
        var tx = new Transaction(_bookId, Guid.NewGuid(), DateTimeOffset.UtcNow, 100m);
        _transactionRepo.Setup(r => r.GetByIdAsync(txId)).ReturnsAsync(tx);
        _bookRepo.Setup(r => r.HasEditAccessAsync(_bookId, _userId)).ReturnsAsync(false);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.DeleteAsync(txId, _userId));
    }
}
