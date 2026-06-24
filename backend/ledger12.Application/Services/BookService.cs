using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Domain.Entities;
using ledger12.Domain.Enums;
using ledger12.Domain.Exceptions;

namespace ledger12.Application.Services;

public class BookService : IBookService
{
    private readonly IBookRepository _bookRepo;
    private readonly IUserRepository _userRepo;
    private readonly ITransactionRepository _transactionRepo;

    public BookService(IBookRepository bookRepo, IUserRepository userRepo, ITransactionRepository transactionRepo)
    {
        _bookRepo = bookRepo;
        _userRepo = userRepo;
        _transactionRepo = transactionRepo;
    }

    public async Task<List<BookDto>> GetBooksAsync(Guid userId)
    {
        var books = await _bookRepo.GetVisibleBooksAsync(userId);
        return books.Select(b => MapToDto(b)).ToList();
    }

    public async Task<BookDto> GetBookAsync(Guid bookId, Guid userId)
    {
        var book = await _bookRepo.GetVisibleBookAsync(bookId, userId);
        if (book == null) throw new NotFoundException("Book", bookId);
        return MapToDto(book);
    }

    public async Task<BookDto> CreateBookAsync(CreateBookRequest request, Guid userId)
    {
        var book = new Book(request.Name, userId, request.Currency);
        await _bookRepo.AddAsync(book);

        // Apply global shares to new book
        var globalShares = await _bookRepo.GetGlobalSharesAsync(userId);
        foreach (var gs in globalShares)
        {
            var share = new BookShare(book.Id, gs.SharedWithUserId, BookPermission.Edit);
            await _bookRepo.AddShareAsync(share);
        }

        return MapToDto(book);
    }

    public async Task<BookDto> UpdateBookAsync(Guid bookId, UpdateBookRequest request, Guid userId)
    {
        var book = await _bookRepo.GetByIdAsync(bookId);
        if (book == null || book.OwnerId != userId)
            throw new NotFoundException("Book", bookId);

        book.Update(request.Name, request.Currency);
        await _bookRepo.UpdateAsync(book);
        return MapToDto(book);
    }

    public async Task DeleteBookAsync(Guid bookId, Guid userId)
    {
        var book = await _bookRepo.GetByIdAsync(bookId);
        if (book == null || book.OwnerId != userId)
            throw new NotFoundException("Book", bookId);

        var mainBook = await _bookRepo.GetMainBookAsync(userId);
        if (mainBook != null && book.Id == mainBook.Id)
            throw new DomainException("Cannot delete the Main book");

        if (await _bookRepo.HasTransactionsAsync(bookId))
            throw new DomainException("Cannot delete a non-empty book");

        await _bookRepo.DeleteAsync(book);
    }

    public async Task<BookStatsResponse> GetBookStatsAsync(Guid bookId, Guid userId, DateTimeOffset? asOf = null)
    {
        var visible = await _bookRepo.IsVisibleAsync(bookId, userId);
        if (!visible) throw new NotFoundException("Book", bookId);

        var count = await _bookRepo.GetTransactionCountAsync(bookId, asOf);
        var sum = await _bookRepo.GetTotalSumAsync(bookId, asOf);
        return new BookStatsResponse(count, sum);
    }

    public async Task<BookDto> GetCurrentBookAsync(Guid userId)
    {
        var pref = await _bookRepo.GetUserPreferenceAsync(userId);
        if (pref?.CurrentBookId != null)
        {
            var book = await _bookRepo.GetVisibleBookAsync(pref.CurrentBookId.Value, userId);
            if (book != null) return MapToDto(book);
        }

        var books = await _bookRepo.GetVisibleBooksAsync(userId);
        var first = books.OrderBy(b => b.CreatedAt).FirstOrDefault();
        if (first == null) throw new NotFoundException("Book", "any");
        return MapToDto(first);
    }

    public async Task<BookDto> SetCurrentBookAsync(Guid bookId, Guid userId)
    {
        var visible = await _bookRepo.IsVisibleAsync(bookId, userId);
        if (!visible) throw new NotFoundException("Book", bookId);

        var pref = await _bookRepo.GetUserPreferenceAsync(userId);
        if (pref == null)
        {
            pref = new UserPreference(userId);
            await _bookRepo.SetUserPreferenceAsync(pref);
        }
        pref.SetCurrentBook(bookId);
        await _bookRepo.SetUserPreferenceAsync(pref);

        var book = await _bookRepo.GetByIdAsync(bookId);
        return MapToDto(book!);
    }

    public async Task<CloseBookResponse> CloseBookAsync(Guid bookId, CloseBookRequest request, Guid userId)
    {
        var book = await _bookRepo.GetByIdAsync(bookId);
        if (book == null || book.OwnerId != userId)
            throw new NotFoundException("Book", bookId);

        if (book.Status == BookStatus.Closed)
            throw new DomainException("Book is already closed");

        var mainBook = await _bookRepo.GetMainBookAsync(userId);
        if (mainBook == null)
            throw new DomainException("No Main book found");

        var netBalance = await _bookRepo.GetTotalSumAsync(bookId);
        var now = DateTimeOffset.UtcNow;

        // Create balancing transaction in Main
        var closingTx = new Transaction(
            bookId: mainBook.Id,
            userId: userId,
            dateTime: now,
            amount: -netBalance,
            categoryName: request.ClosingCategoryName,
            note: $"Close {book.Name}",
            isBookClosingEntry: true,
            closedBookId: book.Id
        );
        await _transactionRepo.AddAsync(closingTx);

        book.Close(now);
        await _bookRepo.UpdateAsync(book);

        return new CloseBookResponse(
            BookId: book.Id.ToString(),
            Status: "closed",
            ClosingTransactionId: closingTx.Id.ToString(),
            NetBalance: netBalance
        );
    }

    public async Task<ReopenBookResponse> ReopenBookAsync(Guid bookId, Guid userId)
    {
        var book = await _bookRepo.GetByIdAsync(bookId);
        if (book == null || book.OwnerId != userId)
            throw new NotFoundException("Book", bookId);

        if (book.Status == BookStatus.Open)
            throw new DomainException("Book is already open");

        book.Reopen();
        await _bookRepo.UpdateAsync(book);

        return new ReopenBookResponse(book.Id.ToString(), "open");
    }

    public async Task<CreateShareResponse> AddShareAsync(Guid bookId, AddShareRequest request, Guid userId)
    {
        var book = await _bookRepo.GetByIdAsync(bookId);
        if (book == null || book.OwnerId != userId)
            throw new NotFoundException("Book", bookId);

        var targetUser = await _userRepo.FindByEmailAsync(request.Email);
        if (targetUser == null)
            throw new NotFoundException("User", request.Email);

        if (targetUser.Value.Id == userId)
            throw new DomainException("Cannot share with yourself");

        var existing = await _bookRepo.GetShareAsync(bookId, targetUser.Value.Id);
        if (existing != null)
            throw new DomainException("Already shared with this user");

        var perm = request.Permission.ToLowerInvariant() == "edit" ? BookPermission.Edit : BookPermission.View;
        var share = new BookShare(bookId, targetUser.Value.Id, perm);
        await _bookRepo.AddShareAsync(share);

        return new CreateShareResponse(targetUser.Value.Id.ToString(), targetUser.Value.Email, 1);
    }

    public async Task UpdateShareAsync(Guid bookId, Guid targetUserId, UpdateShareRequest request, Guid userId)
    {
        var book = await _bookRepo.GetByIdAsync(bookId);
        if (book == null || book.OwnerId != userId)
            throw new NotFoundException("Book", bookId);

        var share = await _bookRepo.GetShareAsync(bookId, targetUserId);
        if (share == null) throw new NotFoundException("Share", targetUserId);

        var perm = request.Permission.ToLowerInvariant() == "edit" ? BookPermission.Edit : BookPermission.View;
        share.SetPermission(perm);
        await _bookRepo.UpdateShareAsync(share);
    }

    public async Task RemoveShareAsync(Guid bookId, Guid targetUserId, Guid userId)
    {
        var book = await _bookRepo.GetByIdAsync(bookId);
        if (book == null || book.OwnerId != userId)
            throw new NotFoundException("Book", bookId);

        var share = await _bookRepo.GetShareAsync(bookId, targetUserId);
        if (share == null) throw new NotFoundException("Share", targetUserId);

        await _bookRepo.DeleteShareAsync(share);
    }

    public async Task<CreateShareResponse> AddGlobalShareAsync(AddShareRequest request, Guid userId)
    {
        var targetUser = await _userRepo.FindByEmailAsync(request.Email);
        if (targetUser == null)
            throw new NotFoundException("User", request.Email);

        if (targetUser.Value.Id == userId)
            throw new DomainException("Cannot share with yourself");

        var existing = await _bookRepo.GetGlobalShareAsync(userId, targetUser.Value.Id);
        if (existing != null)
            throw new DomainException("Already shared with this user");

        var gs = new GlobalShare(userId, targetUser.Value.Id);
        await _bookRepo.AddGlobalShareAsync(gs);

        // Add edit permission to all existing books
        var books = await _bookRepo.GetByOwnerAsync(userId);
        foreach (var book in books)
        {
            var existingShare = await _bookRepo.GetShareAsync(book.Id, targetUser.Value.Id);
            if (existingShare == null)
            {
                var share = new BookShare(book.Id, targetUser.Value.Id, BookPermission.Edit);
                await _bookRepo.AddShareAsync(share);
            }
        }

        return new CreateShareResponse(targetUser.Value.Id.ToString(), targetUser.Value.Email, books.Count);
    }

    public async Task<RemoveShareResponse> RemoveGlobalShareAsync(Guid targetUserId, Guid userId)
    {
        var gs = await _bookRepo.GetGlobalShareAsync(userId, targetUserId);
        if (gs == null) throw new NotFoundException("Share", targetUserId);

        await _bookRepo.DeleteGlobalShareAsync(gs);

        // Remove from all owned books
        var books = await _bookRepo.GetByOwnerAsync(userId);
        foreach (var book in books)
        {
            var share = await _bookRepo.GetShareAsync(book.Id, targetUserId);
            if (share != null)
                await _bookRepo.DeleteShareAsync(share);
        }

        return new RemoveShareResponse(true, books.Count);
    }

    private BookDto MapToDto(Book book)
    {
        var shares = book.Shares?.Select(s => new SharedUserDto(
            s.UserId.ToString(),
            "", // email resolved elsewhere if needed
            s.Permission.ToString().ToLowerInvariant()
        )).ToList() ?? new();

        return new BookDto(
            book.Id.ToString(),
            book.Name,
            book.Currency,
            book.Status.ToString().ToLowerInvariant(),
            book.OwnerId.ToString(),
            shares,
            book.CreatedAt.ToString("o"),
            book.ClosedAt?.ToString("o")
        );
    }
}
