using System.Reflection;
using ledger12.Domain.Entities;
using ledger12.Domain.Enums;
using ledger12.Infrastructure.Data;

namespace ledger12.MigrateFromLedger11;

/// <summary>
/// Converts old ledger11 data shapes to new ledger12 entities.
/// Stateless — takes old records plus a MigrationContext and returns new entities.
/// </summary>
public static class DataMapper
{
    private static readonly BindingFlags PrivateField = BindingFlags.Instance | BindingFlags.NonPublic;

    // ─── Users ──────────────────────────────────────────────────────

    public static AppUser ToAppUser(OldDatabaseReader.OldUser oldUser, MigrationContext ctx)
    {
        var userId = Guid.Parse(oldUser.Id);

        var user = new AppUser
        {
            Id = oldUser.Id,
            UserName = oldUser.UserName,
            NormalizedUserName = oldUser.NormalizedUserName,
            Email = oldUser.Email,
            NormalizedEmail = oldUser.NormalizedEmail,
            EmailConfirmed = oldUser.EmailConfirmed,
            PasswordHash = oldUser.PasswordHash,
            SecurityStamp = oldUser.SecurityStamp,
            PhoneNumber = oldUser.PhoneNumber,
            PhoneNumberConfirmed = oldUser.PhoneNumberConfirmed,
            TwoFactorEnabled = oldUser.TwoFactorEnabled,
            LockoutEnabled = oldUser.LockoutEnabled,
            AccessFailedCount = oldUser.AccessFailedCount,
            ConcurrencyStamp = Guid.NewGuid().ToString(),
        };

        // Register email → GUID mapping
        if (oldUser.Email is not null)
            ctx.EmailToUserId[oldUser.Email] = userId;

        ctx.OldUserIdToNewUserId[oldUser.Id] = userId;

        return user;
    }

    // ─── Books ──────────────────────────────────────────────────────

    public static (Book Book, string SpaceFileId) ToBook(
        OldDatabaseReader.OldSpace oldSpace,
        Guid ownerId,
        MigrationContext ctx)
    {
        var book = new Book(
            name: oldSpace.Name,
            ownerId: ownerId,
            currency: oldSpace.Currency
        );

        // Preserve the old Space GUID as the new Book GUID
        SetPrivateField(book, "<Id>k__BackingField", Guid.Parse(oldSpace.Id));

        // Preserve the original CreatedAt
        if (DateTimeOffset.TryParse(oldSpace.CreatedAt,
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AssumeUniversal,
                out var createdAt))
        {
            SetPrivateField(book, "<CreatedAt>k__BackingField", createdAt);
        }

        var fileId = OldDatabaseReader.GetSpaceFileId(oldSpace.Id);
        ctx.SpaceGuidToBookId[oldSpace.Id] = book.Id;
        ctx.SpaceFileIdToBookId[fileId] = book.Id;

        return (book, fileId);
    }

    // ─── Book Shares ────────────────────────────────────────────────

    public static BookShare ToBookShare(Guid bookId, Guid userId)
        => new(bookId, userId, BookPermission.Edit);

    // ─── Categories ─────────────────────────────────────────────────

    /// <summary>
    /// Creates a Category for a user from an old space category.
    /// If the user already has a category with this name, returns null (deduplicated).
    /// </summary>
    public static Category? ToCategory(
        OldDatabaseReader.OldCategory oldCategory,
        Guid userId,
        string spaceFileId,
        MigrationContext ctx)
    {
        var key = (userId, oldCategory.Name);

        if (ctx.UserCategoryLookup.ContainsKey(key))
        {
            // Already exists for this user — just register the int-ID → name mapping
            ctx.CategoryIdToName[(spaceFileId, oldCategory.Id)] = oldCategory.Name;
            return null;
        }

        var category = new Category(
            name: oldCategory.Name,
            userId: userId,
            color: oldCategory.Color,
            icon: oldCategory.Icon,
            order: oldCategory.DisplayOrder,
            recurring: false
        );

        ctx.UserCategoryLookup[key] = category.Id;
        ctx.CategoryIdToName[(spaceFileId, oldCategory.Id)] = oldCategory.Name;

        return category;
    }

    // ─── Transactions (userId already resolved by engine) ───────────

    public static Transaction? ToTransaction(
        OldDatabaseReader.OldTransaction oldTransaction,
        Guid bookId,
        Guid userId,
        string? categoryName,
        MigrationContext ctx)
    {
        // Parse Amount from TEXT (old model stores as string)
        if (!decimal.TryParse(oldTransaction.Value,
                System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture,
                out var amount))
        {
            return null;
        }

        // Parse DateTime from TEXT
        DateTimeOffset dateTime = DateTimeOffset.UtcNow;
        if (oldTransaction.Date is not null)
        {
            DateTimeOffset.TryParse(oldTransaction.Date,
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AssumeUniversal,
                out dateTime);
        }

        // Parse exchange rate if present
        decimal? exchangeRate = null;
        if (oldTransaction.ExchangeRate is not null)
        {
            decimal.TryParse(oldTransaction.ExchangeRate,
                System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture,
                out var rate);
            exchangeRate = rate;
        }

        return new Transaction(
            bookId: bookId,
            userId: userId,
            dateTime: dateTime,
            amount: amount * (-1),
            originalCurrency: oldTransaction.Currency,
            originalAmount: null,
            exchangeRate: exchangeRate,
            categoryName: categoryName,
            note: oldTransaction.Notes
        );
    }

    // ─── User Preferences ───────────────────────────────────────────

    public static UserPreference ToUserPreference(Guid userId, Guid? currentBookId)
    {
        var pref = new UserPreference(userId);
        pref.SetCurrentBook(currentBookId);
        return pref;
    }

    // ─── Helpers ────────────────────────────────────────────────────

    private static void SetPrivateField(object obj, string fieldName, object value)
    {
        var field = obj.GetType().GetField(fieldName, PrivateField);
        field?.SetValue(obj, value);
    }
}
