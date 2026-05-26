namespace ledger12.Domain;

public enum Granularity
{
    Daily,
    Weekly,
    Monthly,
    Yearly
}

public static class PeriodHelper
{
    public static DateOnly GetPeriodStart(DateTimeOffset date, Granularity granularity)
    {
        var utcDate = date.UtcDateTime.Date;

        return granularity switch
        {
            Granularity.Daily => DateOnly.FromDateTime(utcDate),
            Granularity.Weekly => GetWeekStart(utcDate),
            Granularity.Monthly => new DateOnly(utcDate.Year, utcDate.Month, 1),
            Granularity.Yearly => new DateOnly(utcDate.Year, 1, 1),
            _ => throw new ArgumentOutOfRangeException(nameof(granularity), granularity, null)
        };
    }

    // ISO 8601 week start = Monday
    private static DateOnly GetWeekStart(DateTime date)
    {
        int diff = (7 + (int)date.DayOfWeek - (int)DayOfWeek.Monday) % 7;
        return DateOnly.FromDateTime(date.AddDays(-diff));
    }
}