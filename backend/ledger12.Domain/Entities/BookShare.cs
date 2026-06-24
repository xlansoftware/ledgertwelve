using ledger12.Domain.Enums;

namespace ledger12.Domain.Entities;

public class BookShare
{
    public Guid BookId { get; private set; }
    public Guid UserId { get; private set; }
    public BookPermission Permission { get; private set; }

    public Book Book { get; private set; } = null!;

    private BookShare() { }

    public BookShare(Guid bookId, Guid userId, BookPermission permission)
    {
        BookId = bookId;
        UserId = userId;
        Permission = permission;
    }

    public void SetPermission(BookPermission permission)
    {
        Permission = permission;
    }
}
