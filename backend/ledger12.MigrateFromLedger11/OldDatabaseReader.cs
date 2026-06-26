using Microsoft.Data.Sqlite;

namespace ledger12.MigrateFromLedger11;

/// <summary>
/// Reads data from the legacy ledger11 SQLite databases (appdata.db and space-*.db files).
/// </summary>
public class OldDatabaseReader
{
    private readonly string _appdataPath;

    public OldDatabaseReader(string appdataPath)
    {
        _appdataPath = appdataPath;
    }

    // ─── Old data shapes ────────────────────────────────────────────

    public record OldUser(
        string Id,
        string? CurrentSpaceId,
        string? UserName,
        string? Email,
        string? NormalizedUserName,
        string? NormalizedEmail,
        bool EmailConfirmed,
        string? PasswordHash,
        string? SecurityStamp,
        string? ConcurrencyStamp,
        string? PhoneNumber,
        bool PhoneNumberConfirmed,
        bool TwoFactorEnabled,
        string? LockoutEnd,
        bool LockoutEnabled,
        int AccessFailedCount
    );

    public record OldSpace(
        string Id,
        string Name,
        string CreatedByUserId,
        string CreatedAt,
        string? Tint,
        string? Currency
    );

    public record OldSpaceMember(
        string SpaceId,
        string UserId,
        int AccessLevel
    );

    public record OldCategory(
        int Id,
        string Name,
        int DisplayOrder,
        string? Color,
        string? Icon
    );

    public record OldTransaction(
        int Id,
        string Value,
        string? Date,
        int? CategoryId,
        string? User,
        string? Notes,
        string? Currency,
        string? ExchangeRate
    );

    // ─── Queries ────────────────────────────────────────────────────

    public IReadOnlyList<OldUser> ReadUsers()
    {
        return Query(_appdataPath, "SELECT Id, CurrentSpaceId, UserName, NormalizedUserName, Email, NormalizedEmail, EmailConfirmed, PasswordHash, SecurityStamp, ConcurrencyStamp, PhoneNumber, PhoneNumberConfirmed, TwoFactorEnabled, LockoutEnd, LockoutEnabled, AccessFailedCount FROM AspNetUsers",
            r => new OldUser(
                Id: r.GetString(0),
                CurrentSpaceId: r.IsDBNull(1) ? null : r.GetString(1),
                UserName: r.IsDBNull(2) ? null : r.GetString(2),
                Email: r.IsDBNull(3) ? null : r.GetString(3),
                NormalizedUserName: r.IsDBNull(4) ? null : r.GetString(4),
                NormalizedEmail: r.IsDBNull(5) ? null : r.GetString(5),
                EmailConfirmed: r.GetBoolean(6),
                PasswordHash: r.IsDBNull(7) ? null : r.GetString(7),
                SecurityStamp: r.IsDBNull(8) ? null : r.GetString(8),
                ConcurrencyStamp: r.IsDBNull(9) ? null : r.GetString(9),
                PhoneNumber: r.IsDBNull(10) ? null : r.GetString(10),
                PhoneNumberConfirmed: r.GetBoolean(11),
                TwoFactorEnabled: r.GetBoolean(12),
                LockoutEnd: r.IsDBNull(13) ? null : r.GetString(13),
                LockoutEnabled: r.GetBoolean(14),
                AccessFailedCount: r.GetInt32(15)
            ));
    }

    public IReadOnlyList<OldSpace> ReadSpaces()
    {
        return Query(_appdataPath, "SELECT Id, Name, CreatedByUserId, CreatedAt, Tint, Currency FROM Spaces",
            r => new OldSpace(
                Id: r.GetString(0),
                Name: r.GetString(1),
                CreatedByUserId: r.GetString(2),
                CreatedAt: r.GetString(3),
                Tint: r.IsDBNull(4) ? null : r.GetString(4),
                Currency: r.IsDBNull(5) ? null : r.GetString(5)
            ));
    }

    public IReadOnlyList<OldSpaceMember> ReadSpaceMembers()
    {
        return Query(_appdataPath, "SELECT SpaceId, UserId, AccessLevel FROM SpaceMembers",
            r => new OldSpaceMember(
                SpaceId: r.GetString(0),
                UserId: r.GetString(1),
                AccessLevel: r.GetInt32(2)
            ));
    }

    public IReadOnlyList<OldCategory> ReadCategories(string spaceDbPath)
    {
        return Query(spaceDbPath, "SELECT Id, Name, DisplayOrder, Color, Icon FROM Categories ORDER BY DisplayOrder",
            r => new OldCategory(
                Id: r.GetInt32(0),
                Name: r.GetString(1),
                DisplayOrder: r.GetInt32(2),
                Color: r.IsDBNull(3) ? null : r.GetString(3),
                Icon: r.IsDBNull(4) ? null : r.GetString(4)
            ));
    }

    public IReadOnlyList<OldTransaction> ReadTransactions(string spaceDbPath)
    {
        // Build SELECT dynamically — older schemas lack Currency and ExchangeRate columns
        var cols = GetColumnNames(spaceDbPath, "Transactions");
        var selectedCols = string.Join(", ", cols.Select(c => $"\"{c}\""));
        var sql = $"SELECT {selectedCols} FROM Transactions ORDER BY Id";

        return Query(spaceDbPath, sql,
            r =>
            {
                var id = r.GetInt32(0);
                var value = r.GetString(1);
                var date = r.IsDBNull(2) ? null : r.GetString(2);
                var categoryId = r.IsDBNull(3) ? (int?)null : r.GetInt32(3);
                var user = r.IsDBNull(4) ? null : r.GetString(4);

                string? notes = r.FieldCount > 5 && !r.IsDBNull(5) ? r.GetString(5) : null;
                string? currency = r.FieldCount > 6 && !r.IsDBNull(6) ? r.GetString(6) : null;
                string? exchangeRate = r.FieldCount > 7 && !r.IsDBNull(7) ? r.GetString(7) : null;

                return new OldTransaction(
                    Id: id,
                    Value: value,
                    Date: date,
                    CategoryId: categoryId,
                    User: user,
                    Notes: notes,
                    Currency: currency,
                    ExchangeRate: exchangeRate
                );
            });
    }

    // ─── Settings: read key-value pairs from space DB ────────────────

    /// <summary>
    /// Reads the Settings table from a space DB file. Returns a dictionary of key-value pairs.
    /// If the Settings table does not exist, returns an empty dictionary.
    /// </summary>
    public Dictionary<string, string?> ReadSettings(string spaceDbPath)
    {
        var result = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

        if (!TableExists(spaceDbPath, "Settings"))
            return result;

        using var connection = new SqliteConnection($"Data Source={spaceDbPath}");
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT Key, Value FROM Settings";
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            var key = reader.GetString(0);
            var value = reader.IsDBNull(1) ? null : reader.GetString(1);
            result[key] = value;
        }

        return result;
    }

    // ─── Helper: find space DB file for a space GUID ────────────────

    public static string GetSpaceDbPath(string dataDir, string spaceGuid)
    {
        return Path.Combine(dataDir, $"space-{spaceGuid.ToLowerInvariant()}.db");
    }

    public static string GetSpaceFileId(string spaceGuid)
    {
        return spaceGuid.ToLowerInvariant();
    }

    // ─── Internal ───────────────────────────────────────────────────

    private static bool TableExists(string dbPath, string tableName)
    {
        using var connection = new SqliteConnection($"Data Source={dbPath}");
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=@name";
        command.Parameters.AddWithValue("@name", tableName);
        var count = (long)command.ExecuteScalar()!;
        return count > 0;
    }

    private static List<string> GetColumnNames(string dbPath, string tableName)
    {
        var cols = new List<string>();
        using var connection = new SqliteConnection($"Data Source={dbPath}");
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = $"PRAGMA table_info({tableName})";
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            cols.Add(reader.GetString(1));
        }
        return cols;
    }

    private static IReadOnlyList<T> Query<T>(string dbPath, string sql, Func<SqliteDataReader, T> map)
    {
        var results = new List<T>();
        using var connection = new SqliteConnection($"Data Source={dbPath}");
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = sql;
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            results.Add(map(reader));
        }
        return results;
    }
}
