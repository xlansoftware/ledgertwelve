using ledger12.Domain.Entities;
using ledger12.Domain.Enums;

namespace ledger12.Tests.Unit.Domain;

public class BookShareTests
{
    [Fact]
    public void Constructor_SetsProperties_WhenValidArguments()
    {
        var bookId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var share = new BookShare(bookId, userId, BookPermission.View);

        Assert.Equal(bookId, share.BookId);
        Assert.Equal(userId, share.UserId);
        Assert.Equal(BookPermission.View, share.Permission);
    }

    [Fact]
    public void Constructor_SetsEditPermission()
    {
        var share = new BookShare(Guid.NewGuid(), Guid.NewGuid(), BookPermission.Edit);

        Assert.Equal(BookPermission.Edit, share.Permission);
    }

    [Fact]
    public void SetPermission_UpdatesPermission()
    {
        var share = new BookShare(Guid.NewGuid(), Guid.NewGuid(), BookPermission.View);

        share.SetPermission(BookPermission.Edit);

        Assert.Equal(BookPermission.Edit, share.Permission);
    }

    [Fact]
    public void SetPermission_DowngradesPermission()
    {
        var share = new BookShare(Guid.NewGuid(), Guid.NewGuid(), BookPermission.Edit);

        share.SetPermission(BookPermission.View);

        Assert.Equal(BookPermission.View, share.Permission);
    }
}
