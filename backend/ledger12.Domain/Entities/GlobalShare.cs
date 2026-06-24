namespace ledger12.Domain.Entities;

public class GlobalShare
{
    public Guid OwnerId { get; private set; }
    public Guid SharedWithUserId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private GlobalShare() { }

    public GlobalShare(Guid ownerId, Guid sharedWithUserId)
    {
        OwnerId = ownerId;
        SharedWithUserId = sharedWithUserId;
        CreatedAt = DateTimeOffset.UtcNow;
    }
}
