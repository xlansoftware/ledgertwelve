namespace ledger12.Domain.Entities;

public class UserPreference
{
    public Guid UserId { get; private set; }
    public Guid? CurrentBookId { get; private set; }

    private UserPreference() { }

    public UserPreference(Guid userId)
    {
        UserId = userId;
    }

    public void SetCurrentBook(Guid? bookId)
    {
        CurrentBookId = bookId;
    }
}
