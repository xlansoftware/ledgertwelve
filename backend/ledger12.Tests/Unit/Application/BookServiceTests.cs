using Moq;
using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Application.Services;
using ledger12.Domain.Entities;
using ledger12.Domain.Enums;
using ledger12.Domain.Exceptions;

namespace ledger12.Tests.Unit.Application;

public class BookServiceTests
{
    private readonly Mock<IBookRepository> _bookRepo;
    private readonly Mock<IUserRepository> _userRepo;
    private readonly Mock<ITransactionRepository> _transactionRepo;
    private readonly BookService _service;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _otherUserId = Guid.NewGuid();

    public BookServiceTests()
    {
        _bookRepo = new Mock<IBookRepository>();
        _userRepo = new Mock<IUserRepository>();
        _transactionRepo = new Mock<ITransactionRepository>();
        _service = new BookService(_bookRepo.Object, _userRepo.Object, _transactionRepo.Object);
    }

    [Fact]
    public async Task GetBooksAsync_ReturnsDtos_WhenBooksExist()
    {
        var books = new List<Book>
        {
            new("Book1", _userId, "EUR"),
            new("Book2", _userId, "USD")
        };
        _bookRepo.Setup(r => r.GetVisibleBooksAsync(_userId)).ReturnsAsync(books);

        var result = await _service.GetBooksAsync(_userId);

        Assert.Equal(2, result.Count);
        Assert.Contains(result, b => b.Name == "Book1");
        Assert.Contains(result, b => b.Name == "Book2");
    }

    [Fact]
    public async Task GetBooksAsync_ReturnsEmptyList_WhenNoBooks()
    {
        _bookRepo.Setup(r => r.GetVisibleBooksAsync(_userId)).ReturnsAsync(new List<Book>());

        var result = await _service.GetBooksAsync(_userId);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetBookAsync_ReturnsDto_WhenBookExistsAndVisible()
    {
        var bookId = Guid.NewGuid();
        var book = new Book("Test", _userId, "EUR");
        _bookRepo.Setup(r => r.GetVisibleBookAsync(bookId, _userId)).ReturnsAsync(book);

        var result = await _service.GetBookAsync(bookId, _userId);

        Assert.NotNull(result);
        Assert.Equal("Test", result.Name);
    }

    [Fact]
    public async Task GetBookAsync_ThrowsNotFoundException_WhenBookNotVisible()
    {
        var bookId = Guid.NewGuid();
        _bookRepo.Setup(r => r.GetVisibleBookAsync(bookId, _userId)).ReturnsAsync((Book?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetBookAsync(bookId, _userId));
    }

    [Fact]
    public async Task CreateBookAsync_ReturnsDto_WhenValidRequest()
    {
        var request = new CreateBookRequest("New Book", "EUR");
        _bookRepo.Setup(r => r.GetGlobalSharesAsync(_userId)).ReturnsAsync(new List<GlobalShare>());
        _bookRepo.Setup(r => r.AddAsync(It.IsAny<Book>())).Returns(Task.CompletedTask);

        var result = await _service.CreateBookAsync(request, _userId);

        Assert.Equal("New Book", result.Name);
        Assert.Equal("EUR", result.Currency);
        _bookRepo.Verify(r => r.AddAsync(It.IsAny<Book>()), Times.Once);
    }

    [Fact]
    public async Task CreateBookAsync_AppliesGlobalShares_WhenTheyExist()
    {
        var request = new CreateBookRequest("New Book", "EUR");
        var sharedUserId = Guid.NewGuid();
        _bookRepo.Setup(r => r.GetGlobalSharesAsync(_userId))
            .ReturnsAsync(new List<GlobalShare> { new(_userId, sharedUserId) });
        _bookRepo.Setup(r => r.AddAsync(It.IsAny<Book>())).Returns(Task.CompletedTask);

        await _service.CreateBookAsync(request, _userId);

        _bookRepo.Verify(r => r.AddShareAsync(It.Is<BookShare>(s =>
            s.UserId == sharedUserId && s.Permission == BookPermission.Edit)), Times.Once);
    }

    [Fact]
    public async Task UpdateBookAsync_ReturnsDto_WhenOwner()
    {
        var bookId = Guid.NewGuid();
        var book = new Book("Old", _userId, "EUR");
        _bookRepo.Setup(r => r.GetByIdAsync(bookId)).ReturnsAsync(book);
        _bookRepo.Setup(r => r.UpdateAsync(It.IsAny<Book>())).Returns(Task.CompletedTask);

        var result = await _service.UpdateBookAsync(bookId, new UpdateBookRequest("Updated", "USD"), _userId);

        Assert.Equal("Updated", result.Name);
    }

    [Fact]
    public async Task UpdateBookAsync_ThrowsNotFoundException_WhenNotOwner()
    {
        var bookId = Guid.NewGuid();
        var book = new Book("Test", _otherUserId, "EUR");
        _bookRepo.Setup(r => r.GetByIdAsync(bookId)).ReturnsAsync(book);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _service.UpdateBookAsync(bookId, new UpdateBookRequest("Updated", "USD"), _userId));
    }

    [Fact]
    public async Task UpdateBookAsync_ThrowsNotFoundException_WhenBookDoesNotExist()
    {
        var bookId = Guid.NewGuid();
        _bookRepo.Setup(r => r.GetByIdAsync(bookId)).ReturnsAsync((Book?)null);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _service.UpdateBookAsync(bookId, new UpdateBookRequest("Updated", "USD"), _userId));
    }

    [Fact]
    public async Task DeleteBookAsync_Deletes_WhenOwnerAndEmpty()
    {
        var bookId = Guid.NewGuid();
        var mainBook = new Book("Main", _userId, "EUR");
        var book = new Book("Test", _userId, "EUR");
        _bookRepo.Setup(r => r.GetByIdAsync(bookId)).ReturnsAsync(book);
        _bookRepo.Setup(r => r.GetMainBookAsync(_userId)).ReturnsAsync(mainBook);
        _bookRepo.Setup(r => r.HasTransactionsAsync(bookId)).ReturnsAsync(false);
        _bookRepo.Setup(r => r.DeleteAsync(It.IsAny<Book>())).Returns(Task.CompletedTask);

        await _service.DeleteBookAsync(bookId, _userId);

        _bookRepo.Verify(r => r.DeleteAsync(book), Times.Once);
    }

    [Fact]
    public async Task DeleteBookAsync_ThrowsDomainException_WhenDeletingMainBook()
    {
        var bookId = Guid.NewGuid();
        var mainBook = new Book("Main", _userId, "EUR");
        _bookRepo.Setup(r => r.GetByIdAsync(bookId)).ReturnsAsync(mainBook);
        _bookRepo.Setup(r => r.GetMainBookAsync(_userId)).ReturnsAsync(mainBook);

        await Assert.ThrowsAsync<DomainException>(() => _service.DeleteBookAsync(bookId, _userId));
    }

    [Fact]
    public async Task DeleteBookAsync_ThrowsDomainException_WhenBookHasTransactions()
    {
        var bookId = Guid.NewGuid();
        var mainBook = new Book("Main", _userId, "EUR");
        var book = new Book("Test", _userId, "EUR");
        _bookRepo.Setup(r => r.GetByIdAsync(bookId)).ReturnsAsync(book);
        _bookRepo.Setup(r => r.GetMainBookAsync(_userId)).ReturnsAsync(mainBook);
        _bookRepo.Setup(r => r.HasTransactionsAsync(bookId)).ReturnsAsync(true);

        await Assert.ThrowsAsync<DomainException>(() => _service.DeleteBookAsync(bookId, _userId));
    }

    [Fact]
    public async Task GetBookStatsAsync_ReturnsStats_WhenBookVisible()
    {
        var bookId = Guid.NewGuid();
        _bookRepo.Setup(r => r.IsVisibleAsync(bookId, _userId)).ReturnsAsync(true);
        _bookRepo.Setup(r => r.GetTransactionCountAsync(bookId, null)).ReturnsAsync(5);
        _bookRepo.Setup(r => r.GetTotalSumAsync(bookId, null)).ReturnsAsync(1500m);

        var result = await _service.GetBookStatsAsync(bookId, _userId);

        Assert.Equal(5, result.TransactionCount);
        Assert.Equal(1500m, result.TotalSum);
    }

    [Fact]
    public async Task GetBookStatsAsync_ThrowsNotFoundException_WhenNotVisible()
    {
        _bookRepo.Setup(r => r.IsVisibleAsync(It.IsAny<Guid>(), _userId)).ReturnsAsync(false);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetBookStatsAsync(Guid.NewGuid(), _userId));
    }

    [Fact]
    public async Task GetCurrentBookAsync_ReturnsCurrentBook_WhenPrefExists()
    {
        var bookId = Guid.NewGuid();
        var book = new Book("Current", _userId, "EUR");
        var pref = new UserPreference(_userId);
        pref.SetCurrentBook(bookId);
        _bookRepo.Setup(r => r.GetUserPreferenceAsync(_userId)).ReturnsAsync(pref);
        _bookRepo.Setup(r => r.GetVisibleBookAsync(bookId, _userId)).ReturnsAsync(book);

        var result = await _service.GetCurrentBookAsync(_userId);

        Assert.Equal("Current", result.Name);
    }

    [Fact]
    public async Task GetCurrentBookAsync_ReturnsFirstBook_WhenNoPref()
    {
        var book = new Book("First", _userId, "EUR");
        _bookRepo.Setup(r => r.GetUserPreferenceAsync(_userId)).ReturnsAsync((UserPreference?)null);
        _bookRepo.Setup(r => r.GetVisibleBooksAsync(_userId)).ReturnsAsync(new List<Book> { book });

        var result = await _service.GetCurrentBookAsync(_userId);

        Assert.Equal("First", result.Name);
    }

    [Fact]
    public async Task SetCurrentBookAsync_SetsPref_WhenBookVisible()
    {
        var bookId = Guid.NewGuid();
        var book = new Book("Test", _userId, "EUR");
        _bookRepo.Setup(r => r.IsVisibleAsync(bookId, _userId)).ReturnsAsync(true);
        _bookRepo.Setup(r => r.GetUserPreferenceAsync(_userId)).ReturnsAsync((UserPreference?)null);
        _bookRepo.Setup(r => r.SetUserPreferenceAsync(It.IsAny<UserPreference>())).Returns(Task.CompletedTask);
        _bookRepo.Setup(r => r.GetByIdAsync(bookId)).ReturnsAsync(book);

        var result = await _service.SetCurrentBookAsync(bookId, _userId);

        Assert.Equal("Test", result.Name);
    }

    [Fact]
    public async Task CloseBookAsync_ClosesBook_WhenOwner()
    {
        var bookId = Guid.NewGuid();
        var book = new Book("Test", _userId, "EUR");
        var mainBook = new Book("Main", _userId, "EUR");
        _bookRepo.Setup(r => r.GetByIdAsync(bookId)).ReturnsAsync(book);
        _bookRepo.Setup(r => r.GetMainBookAsync(_userId)).ReturnsAsync(mainBook);
        _bookRepo.Setup(r => r.GetTotalSumAsync(bookId)).ReturnsAsync(500m);
        _transactionRepo.Setup(r => r.AddAsync(It.IsAny<Transaction>())).Returns(Task.CompletedTask);
        _bookRepo.Setup(r => r.UpdateAsync(It.IsAny<Book>())).Returns(Task.CompletedTask);

        var result = await _service.CloseBookAsync(bookId, new CloseBookRequest("Closing"), _userId);

        Assert.Equal("closed", result.Status);
        Assert.Equal(500m, result.NetBalance);
        _bookRepo.Verify(r => r.UpdateAsync(It.Is<Book>(b => b.Status == BookStatus.Closed)), Times.Once);
    }

    [Fact]
    public async Task CloseBookAsync_ThrowsNotFoundException_WhenNotOwner()
    {
        var book = new Book("Test", _otherUserId, "EUR");
        _bookRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync(book);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _service.CloseBookAsync(Guid.NewGuid(), new CloseBookRequest("Closing"), _userId));
    }

    [Fact]
    public async Task CloseBookAsync_ThrowsDomainException_WhenAlreadyClosed()
    {
        var bookId = Guid.NewGuid();
        var book = new Book("Test", _userId, "EUR");
        book.Close(DateTimeOffset.UtcNow);
        _bookRepo.Setup(r => r.GetByIdAsync(bookId)).ReturnsAsync(book);

        await Assert.ThrowsAsync<DomainException>(() =>
            _service.CloseBookAsync(bookId, new CloseBookRequest("Closing"), _userId));
    }

    [Fact]
    public async Task ReopenBookAsync_ReopensBook_WhenOwnerAndClosed()
    {
        var bookId = Guid.NewGuid();
        var book = new Book("Test", _userId, "EUR");
        book.Close(DateTimeOffset.UtcNow);
        _bookRepo.Setup(r => r.GetByIdAsync(bookId)).ReturnsAsync(book);
        _bookRepo.Setup(r => r.UpdateAsync(It.IsAny<Book>())).Returns(Task.CompletedTask);

        var result = await _service.ReopenBookAsync(bookId, _userId);

        Assert.Equal("open", result.Status);
    }

    [Fact]
    public async Task ReopenBookAsync_ThrowsDomainException_WhenAlreadyOpen()
    {
        var bookId = Guid.NewGuid();
        var book = new Book("Test", _userId, "EUR");
        _bookRepo.Setup(r => r.GetByIdAsync(bookId)).ReturnsAsync(book);

        await Assert.ThrowsAsync<DomainException>(() => _service.ReopenBookAsync(bookId, _userId));
    }

    [Fact]
    public async Task AddShareAsync_AddsShare_WhenValid()
    {
        var bookId = Guid.NewGuid();
        var book = new Book("Test", _userId, "EUR");
        var targetUser = (Guid.NewGuid(), "user@example.com");
        _bookRepo.Setup(r => r.GetByIdAsync(bookId)).ReturnsAsync(book);
        _userRepo.Setup(r => r.FindByEmailAsync("user@example.com")).ReturnsAsync(targetUser);
        _bookRepo.Setup(r => r.GetShareAsync(bookId, targetUser.Item1)).ReturnsAsync((BookShare?)null);
        _bookRepo.Setup(r => r.AddShareAsync(It.IsAny<BookShare>())).Returns(Task.CompletedTask);

        var result = await _service.AddShareAsync(bookId, new AddShareRequest("user@example.com", "view"), _userId);

        Assert.NotNull(result);
        Assert.Equal(1, result.AffectedBooks);
    }

    [Fact]
    public async Task AddShareAsync_ThrowsDomainException_WhenSharingWithSelf()
    {
        var bookId = Guid.NewGuid();
        var book = new Book("Test", _userId, "EUR");
        _bookRepo.Setup(r => r.GetByIdAsync(bookId)).ReturnsAsync(book);
        _userRepo.Setup(r => r.FindByEmailAsync("self@example.com")).ReturnsAsync((_userId, "self@example.com"));

        await Assert.ThrowsAsync<DomainException>(() =>
            _service.AddShareAsync(bookId, new AddShareRequest("self@example.com", "view"), _userId));
    }

    [Fact]
    public async Task RemoveShareAsync_RemovesShare_WhenOwner()
    {
        var bookId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var book = new Book("Test", _userId, "EUR");
        var share = new BookShare(bookId, targetUserId, BookPermission.View);
        _bookRepo.Setup(r => r.GetByIdAsync(bookId)).ReturnsAsync(book);
        _bookRepo.Setup(r => r.GetShareAsync(bookId, targetUserId)).ReturnsAsync(share);
        _bookRepo.Setup(r => r.DeleteShareAsync(It.IsAny<BookShare>())).Returns(Task.CompletedTask);

        await _service.RemoveShareAsync(bookId, targetUserId, _userId);

        _bookRepo.Verify(r => r.DeleteShareAsync(share), Times.Once);
    }

    [Fact]
    public async Task AddGlobalShareAsync_AddsGlobalShare_WhenValid()
    {
        var targetUser = (Guid.NewGuid(), "user@example.com");
        _userRepo.Setup(r => r.FindByEmailAsync("user@example.com")).ReturnsAsync(targetUser);
        _bookRepo.Setup(r => r.GetGlobalShareAsync(_userId, targetUser.Item1)).ReturnsAsync((GlobalShare?)null);
        _bookRepo.Setup(r => r.AddGlobalShareAsync(It.IsAny<GlobalShare>())).Returns(Task.CompletedTask);
        _bookRepo.Setup(r => r.GetByOwnerAsync(_userId)).ReturnsAsync(new List<Book>());

        var result = await _service.AddGlobalShareAsync(new AddShareRequest("user@example.com", "edit"), _userId);

        Assert.NotNull(result);
        _bookRepo.Verify(r => r.AddGlobalShareAsync(It.IsAny<GlobalShare>()), Times.Once);
    }

    [Fact]
    public async Task RemoveGlobalShareAsync_RemovesShare_WhenExists()
    {
        var targetUserId = Guid.NewGuid();
        var gs = new GlobalShare(_userId, targetUserId);
        _bookRepo.Setup(r => r.GetGlobalShareAsync(_userId, targetUserId)).ReturnsAsync(gs);
        _bookRepo.Setup(r => r.DeleteGlobalShareAsync(It.IsAny<GlobalShare>())).Returns(Task.CompletedTask);
        _bookRepo.Setup(r => r.GetByOwnerAsync(_userId)).ReturnsAsync(new List<Book>());

        var result = await _service.RemoveGlobalShareAsync(targetUserId, _userId);

        Assert.True(result.Removed);
        _bookRepo.Verify(r => r.DeleteGlobalShareAsync(gs), Times.Once);
    }
}
