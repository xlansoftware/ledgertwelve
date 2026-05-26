using ledger12.Application.DTOs;
using ledger12.Application.Interfaces;
using ledger12.Application.Services;
using ledger12.Domain;
using Moq;

namespace ledger12.Tests.Unit;

public class DashboardServiceTests
{
    private readonly Mock<ITransactionRepository> _repositoryMock;
    private readonly DashboardService _service;

    public DashboardServiceTests()
    {
        _repositoryMock = new Mock<ITransactionRepository>();
        _service = new DashboardService(_repositoryMock.Object);
    }

    [Fact]
    public async Task GetDashboardAsync_DefaultsDateRange_WhenFromAndToAreNotProvided()
    {
        // Arrange
        var query = new DashboardQuery(From: null, To: null, Book: null, Author: null, Category: null, Currency: null, Page: 1, PageSize: 20);

        _repositoryMock
            .Setup(r => r.GetAggregatesAsync<DailyAggregate>(It.IsAny<Granularity>(), It.IsAny<AggregateFilter>()))
            .ReturnsAsync(new PagedResult<DailyAggregate>([], 0, 1, 20));

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Act
        var result = await _service.GetDashboardAsync(Granularity.Daily, query);

        // Assert - filter should have From = today - 90, To = today
        _repositoryMock.Verify(r => r.GetAggregatesAsync<DailyAggregate>(
            Granularity.Daily,
            It.Is<AggregateFilter>(f => f.From == today.AddDays(-90) && f.To == today)
        ), Times.Once);
    }

    [Fact]
    public async Task GetDashboardAsync_UsesProvidedFromAndTo()
    {
        // Arrange
        var from = new DateOnly(2026, 1, 1);
        var to = new DateOnly(2026, 3, 31);
        var query = new DashboardQuery(from, to, null, null, null, null, 1, 20);

        _repositoryMock
            .Setup(r => r.GetAggregatesAsync<DailyAggregate>(It.IsAny<Granularity>(), It.IsAny<AggregateFilter>()))
            .ReturnsAsync(new PagedResult<DailyAggregate>([], 0, 1, 20));

        // Act
        var result = await _service.GetDashboardAsync(Granularity.Daily, query);

        // Assert
        _repositoryMock.Verify(r => r.GetAggregatesAsync<DailyAggregate>(
            Granularity.Daily,
            It.Is<AggregateFilter>(f => f.From == from && f.To == to)
        ), Times.Once);
    }

    [Fact]
    public async Task GetDashboardAsync_ThrowsArgumentException_WhenFromAfterTo()
    {
        // Arrange
        var from = new DateOnly(2026, 6, 1);
        var to = new DateOnly(2026, 5, 1);
        var query = new DashboardQuery(from, to, null, null, null, null, 1, 20);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ArgumentException>(
            () => _service.GetDashboardAsync(Granularity.Daily, query));

        Assert.Contains("from", ex.Message, StringComparison.OrdinalIgnoreCase);
        _repositoryMock.Verify(r => r.GetAggregatesAsync<DailyAggregate>(
            It.IsAny<Granularity>(), It.IsAny<AggregateFilter>()), Times.Never);
    }

    [Theory]
    [InlineData(Granularity.Daily, typeof(DailyAggregate))]
    [InlineData(Granularity.Weekly, typeof(WeeklyAggregate))]
    [InlineData(Granularity.Monthly, typeof(MonthlyAggregate))]
    [InlineData(Granularity.Yearly, typeof(YearlyAggregate))]
    public async Task GetDashboardAsync_SelectsCorrectAggregateType_ByGranularity(Granularity granularity, Type expectedType)
    {
        // Arrange
        var query = new DashboardQuery(null, null, null, null, null, null, 1, 20);

        // Setup via reflection to avoid compile-time type constraints
        var setupMethod = typeof(DashboardServiceTests)
            .GetMethod(nameof(SetupMockForType), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!
            .MakeGenericMethod(expectedType);
        setupMethod.Invoke(this, null);

        // Act
        await _service.GetDashboardAsync(granularity, query);

        // Assert — the service called GetAggregatesAsync with the correct T
        var verifyMethod = typeof(DashboardServiceTests)
            .GetMethod(nameof(VerifyMockForType), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!
            .MakeGenericMethod(expectedType);
        verifyMethod.Invoke(this, [granularity]);
    }

    private void SetupMockForType<T>() where T : class, IAggregateEntity
    {
        _repositoryMock
            .Setup(r => r.GetAggregatesAsync<T>(It.IsAny<Granularity>(), It.IsAny<AggregateFilter>()))
            .ReturnsAsync(new PagedResult<T>([], 0, 1, 20));
    }

    private void VerifyMockForType<T>(Granularity granularity) where T : class, IAggregateEntity
    {
        _repositoryMock.Verify(
            r => r.GetAggregatesAsync<T>(granularity, It.IsAny<AggregateFilter>()),
            Times.Once);
    }

    [Fact]
    public async Task GetDashboardAsync_ReturnsMappedAggregateResponse()
    {
        // Arrange
        var query = new DashboardQuery(null, null, null, null, null, null, 1, 20);
        var aggregates = new List<DailyAggregate>
        {
            new(new DateOnly(2026, 5, 26), "Personal", "Alice", "Food", "USD", 150.50m)
        };

        _repositoryMock
            .Setup(r => r.GetAggregatesAsync<DailyAggregate>(Granularity.Daily, It.IsAny<AggregateFilter>()))
            .ReturnsAsync(new PagedResult<DailyAggregate>(aggregates, 1, 1, 20));

        // Act
        var result = await _service.GetDashboardAsync(Granularity.Daily, query);

        // Assert
        Assert.Single(result.Items);
        var item = result.Items[0];
        Assert.Equal(new DateOnly(2026, 5, 26), item.PeriodStart);
        Assert.Equal("Personal", item.Book);
        Assert.Equal("Alice", item.Author);
        Assert.Equal("Food", item.Category);
        Assert.Equal("USD", item.Currency);
        Assert.Equal(150.50m, item.SumValue);
        Assert.Equal(1, item.TransactionCount);
        Assert.Equal(1, result.TotalCount);
        Assert.Equal(1, result.Page);
        Assert.Equal(20, result.PageSize);
    }

    [Fact]
    public async Task GetDashboardAsync_ReturnsEmptyResult_WhenNoAggregatesMatch()
    {
        // Arrange
        var query = new DashboardQuery(new DateOnly(2025, 1, 1), new DateOnly(2025, 1, 31), null, null, null, null, 1, 20);

        _repositoryMock
            .Setup(r => r.GetAggregatesAsync<DailyAggregate>(Granularity.Daily, It.IsAny<AggregateFilter>()))
            .ReturnsAsync(new PagedResult<DailyAggregate>([], 0, 1, 20));

        // Act
        var result = await _service.GetDashboardAsync(Granularity.Daily, query);

        // Assert
        Assert.Empty(result.Items);
        Assert.Equal(0, result.TotalCount);
    }

    [Fact]
    public async Task GetDashboardAsync_PassesPaginationParamsToRepository()
    {
        // Arrange
        var query = new DashboardQuery(null, null, null, null, null, null, Page: 3, PageSize: 10);

        _repositoryMock
            .Setup(r => r.GetAggregatesAsync<DailyAggregate>(It.IsAny<Granularity>(), It.IsAny<AggregateFilter>()))
            .ReturnsAsync(new PagedResult<DailyAggregate>([], 0, 3, 10));

        // Act
        var result = await _service.GetDashboardAsync(Granularity.Daily, query);

        // Assert
        _repositoryMock.Verify(r => r.GetAggregatesAsync<DailyAggregate>(
            Granularity.Daily,
            It.Is<AggregateFilter>(f => f.Page == 3 && f.PageSize == 10)
        ), Times.Once);

        Assert.Equal(3, result.Page);
        Assert.Equal(10, result.PageSize);
    }

    [Fact]
    public async Task GetDashboardAsync_PassesFilterParamsToRepository()
    {
        // Arrange
        var query = new DashboardQuery(null, null, Book: "Personal", Author: "Alice", Category: "Food", Currency: "USD", Page: 1, PageSize: 20);

        _repositoryMock
            .Setup(r => r.GetAggregatesAsync<DailyAggregate>(It.IsAny<Granularity>(), It.IsAny<AggregateFilter>()))
            .ReturnsAsync(new PagedResult<DailyAggregate>([], 0, 1, 20));

        // Act
        await _service.GetDashboardAsync(Granularity.Daily, query);

        // Assert
        _repositoryMock.Verify(r => r.GetAggregatesAsync<DailyAggregate>(
            Granularity.Daily,
            It.Is<AggregateFilter>(f =>
                f.Book == "Personal" &&
                f.Author == "Alice" &&
                f.Category == "Food" &&
                f.Currency == "USD")
        ), Times.Once);
    }

    [Fact]
    public async Task GetDashboardAsync_ClampsPageToAtLeastOne()
    {
        // Arrange
        var query = new DashboardQuery(null, null, null, null, null, null, Page: 0, PageSize: 20);

        _repositoryMock
            .Setup(r => r.GetAggregatesAsync<DailyAggregate>(It.IsAny<Granularity>(), It.IsAny<AggregateFilter>()))
            .ReturnsAsync(new PagedResult<DailyAggregate>([], 0, 1, 20));

        // Act
        await _service.GetDashboardAsync(Granularity.Daily, query);

        // Assert
        _repositoryMock.Verify(r => r.GetAggregatesAsync<DailyAggregate>(
            Granularity.Daily,
            It.Is<AggregateFilter>(f => f.Page == 1)
        ), Times.Once);
    }

    [Fact]
    public async Task GetDashboardAsync_ClampsPageSizeBetweenOneAndOneThousand()
    {
        // Arrange
        var queryTooSmall = new DashboardQuery(null, null, null, null, null, null, Page: 1, PageSize: 0);
        var queryTooLarge = new DashboardQuery(null, null, null, null, null, null, Page: 1, PageSize: 5000);

        _repositoryMock
            .Setup(r => r.GetAggregatesAsync<DailyAggregate>(It.IsAny<Granularity>(), It.IsAny<AggregateFilter>()))
            .ReturnsAsync(new PagedResult<DailyAggregate>([], 0, 1, 20));

        // Act & Assert - too small
        await _service.GetDashboardAsync(Granularity.Daily, queryTooSmall);
        _repositoryMock.Verify(r => r.GetAggregatesAsync<DailyAggregate>(
            Granularity.Daily,
            It.Is<AggregateFilter>(f => f.PageSize == 1)
        ), Times.Once);

        _repositoryMock.Reset();
        _repositoryMock
            .Setup(r => r.GetAggregatesAsync<DailyAggregate>(It.IsAny<Granularity>(), It.IsAny<AggregateFilter>()))
            .ReturnsAsync(new PagedResult<DailyAggregate>([], 0, 1, 1000));

        // too large
        await _service.GetDashboardAsync(Granularity.Daily, queryTooLarge);
        _repositoryMock.Verify(r => r.GetAggregatesAsync<DailyAggregate>(
            Granularity.Daily,
            It.Is<AggregateFilter>(f => f.PageSize == 1000)
        ), Times.Once);
    }
}