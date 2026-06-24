using ledger12.Domain.Entities;

namespace ledger12.Tests.Unit.Domain;

public class GlobalShareTests
{
    [Fact]
    public void Constructor_SetsProperties()
    {
        var ownerId = Guid.NewGuid();
        var sharedWithUserId = Guid.NewGuid();

        var share = new GlobalShare(ownerId, sharedWithUserId);

        Assert.Equal(ownerId, share.OwnerId);
        Assert.Equal(sharedWithUserId, share.SharedWithUserId);
    }
}
