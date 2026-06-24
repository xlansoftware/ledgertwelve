using ledger12.Domain.Entities;

namespace ledger12.Tests.Unit.Domain;

public class UserPreferenceTests
{
    [Fact]
    public void Constructor_SetsUserId_WhenCreated()
    {
        var userId = Guid.NewGuid();
        var pref = new UserPreference(userId);

        Assert.Equal(userId, pref.UserId);
        Assert.Null(pref.CurrentBookId);
    }

    [Fact]
    public void SetCurrentBook_UpdatesCurrentBookId()
    {
        var userId = Guid.NewGuid();
        var bookId = Guid.NewGuid();
        var pref = new UserPreference(userId);

        pref.SetCurrentBook(bookId);

        Assert.Equal(bookId, pref.CurrentBookId);
    }

    [Fact]
    public void SetCurrentBook_ClearsCurrentBookId_WhenNull()
    {
        var userId = Guid.NewGuid();
        var pref = new UserPreference(userId);
        pref.SetCurrentBook(Guid.NewGuid());

        pref.SetCurrentBook(null);

        Assert.Null(pref.CurrentBookId);
    }
}
