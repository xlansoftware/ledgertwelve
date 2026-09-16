using System.Threading.Channels;
using ledger12.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ledger12.Infrastructure.Services;

public class ExportJobProcessor : BackgroundService
{
    private readonly Channel<Guid> _channel;
    private readonly IServiceScopeFactory _scopeFactory;

    public ExportJobProcessor(Channel<Guid> channel, IServiceScopeFactory scopeFactory)
    {
        _channel = channel;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var jobId in _channel.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var jobRepo = scope.ServiceProvider.GetRequiredService<IExportJobRepository>();
                var job = await jobRepo.GetByIdAsync(jobId);
                if (job == null) continue;

                var exportService = scope.ServiceProvider.GetRequiredService<IExportService>();
                await exportService.ProcessExportAsync(job);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Export processing error: {ex.Message}");
            }
        }
    }
}
