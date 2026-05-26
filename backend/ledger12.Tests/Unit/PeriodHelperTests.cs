using ledger12.Domain;

namespace ledger12.Tests.Unit;

public class PeriodHelperTests
{
    [Theory]
    [InlineData("2026-05-26T12:00:00Z", "2026-05-26")] // Tuesday
    [InlineData("2026-05-01T00:00:00Z", "2026-05-01")] // start of month
    [InlineData("2026-12-31T23:59:59Z", "2026-12-31")] // year boundary
    [InlineData("2026-01-01T00:00:00Z", "2026-01-01")] // start of year
    public void GetPeriodStart_Daily_ReturnsUtcDate(string dateTimeStr, string expectedDateStr)
    {
        var date = DateTimeOffset.Parse(dateTimeStr);
        var result = PeriodHelper.GetPeriodStart(date, Granularity.Daily);
        Assert.Equal(DateOnly.Parse(expectedDateStr), result);
    }

    [Theory]
    [InlineData("2026-05-25T00:00:00Z", "2026-05-25")] // Monday -> Monday
    [InlineData("2026-05-26T12:00:00Z", "2026-05-25")] // Tuesday -> Monday
    [InlineData("2026-05-31T23:59:59Z", "2026-05-25")] // Sunday -> Monday
    [InlineData("2026-06-01T00:00:00Z", "2026-06-01")] // Monday -> Monday (month boundary)
    public void GetPeriodStart_Weekly_ReturnsMonday(string dateTimeStr, string expectedDateStr)
    {
        var date = DateTimeOffset.Parse(dateTimeStr);
        var result = PeriodHelper.GetPeriodStart(date, Granularity.Weekly);
        Assert.Equal(DateOnly.Parse(expectedDateStr), result);
    }

    [Fact]
    public void GetPeriodStart_Weekly_YearBoundary_ReturnsMondayOfIsoWeek()
    {
        // 2026-01-01 is a Thursday; the ISO week's Monday is 2025-12-29
        var date = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
        var result = PeriodHelper.GetPeriodStart(date, Granularity.Weekly);
        Assert.Equal(new DateOnly(2025, 12, 29), result);
    }

    [Fact]
    public void GetPeriodStart_Weekly_MondayMidnight_ReturnsSameDay()
    {
        // Monday at midnight UTC
        var date = new DateTimeOffset(2026, 6, 1, 0, 0, 0, TimeSpan.Zero);
        var result = PeriodHelper.GetPeriodStart(date, Granularity.Weekly);
        Assert.Equal(new DateOnly(2026, 6, 1), result);
    }

    [Theory]
    [InlineData("2026-05-01T00:00:00Z", "2026-05-01")] // 1st
    [InlineData("2026-05-15T12:30:00Z", "2026-05-01")] // mid-month
    [InlineData("2026-05-31T23:59:59Z", "2026-05-01")] // last day
    public void GetPeriodStart_Monthly_ReturnsFirstOfMonth(string dateTimeStr, string expectedDateStr)
    {
        var date = DateTimeOffset.Parse(dateTimeStr);
        var result = PeriodHelper.GetPeriodStart(date, Granularity.Monthly);
        Assert.Equal(DateOnly.Parse(expectedDateStr), result);
    }

    [Fact]
    public void GetPeriodStart_Monthly_LeapYear_ReturnsFirstOfFebruary()
    {
        // 2028 is a leap year, Feb 29 exists
        var date = new DateTimeOffset(2028, 2, 29, 10, 0, 0, TimeSpan.Zero);
        var result = PeriodHelper.GetPeriodStart(date, Granularity.Monthly);
        Assert.Equal(new DateOnly(2028, 2, 1), result);
    }

    [Theory]
    [InlineData("2026-01-01T00:00:00Z", "2026-01-01")] // start of year
    [InlineData("2026-06-15T12:00:00Z", "2026-01-01")] // mid-year
    [InlineData("2026-12-31T23:59:59Z", "2026-01-01")] // last day
    public void GetPeriodStart_Yearly_ReturnsFirstOfYear(string dateTimeStr, string expectedDateStr)
    {
        var date = DateTimeOffset.Parse(dateTimeStr);
        var result = PeriodHelper.GetPeriodStart(date, Granularity.Yearly);
        Assert.Equal(DateOnly.Parse(expectedDateStr), result);
    }

    [Fact]
    public void GetPeriodStart_AllGranularities_ReturnDifferentPrecisions()
    {
        var date = new DateTimeOffset(2026, 6, 15, 10, 30, 0, TimeSpan.Zero); // Monday is June 15

        var daily = PeriodHelper.GetPeriodStart(date, Granularity.Daily);
        var weekly = PeriodHelper.GetPeriodStart(date, Granularity.Weekly);
        var monthly = PeriodHelper.GetPeriodStart(date, Granularity.Monthly);
        var yearly = PeriodHelper.GetPeriodStart(date, Granularity.Yearly);

        Assert.Equal(new DateOnly(2026, 6, 15), daily);
        Assert.Equal(new DateOnly(2026, 6, 15), weekly); // June 15 2026 is a Monday
        Assert.Equal(new DateOnly(2026, 6, 1), monthly);
        Assert.Equal(new DateOnly(2026, 1, 1), yearly);
    }

    [Fact]
    public void GetPeriodStart_ThrowsArgumentOutOfRange_ForInvalidGranularity()
    {
        var date = DateTimeOffset.UtcNow;
        var ex = Assert.Throws<ArgumentOutOfRangeException>(
            () => PeriodHelper.GetPeriodStart(date, (Granularity)999));
        Assert.Equal("granularity", ex.ParamName);
    }
}
