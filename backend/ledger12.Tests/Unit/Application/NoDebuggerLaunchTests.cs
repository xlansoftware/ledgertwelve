namespace ledger12.Tests.Unit.Application;

/// <summary>
/// Regression guard: the import path must never attempt to attach a debugger.
/// A stray <c>Debugger.Launch()</c> can stall a request thread and is never
/// appropriate in shipped code.
/// </summary>
public class NoDebuggerLaunchTests
{
    private const string ForbiddenCall = "Debugger.Launch";

    [Fact]
    public void ShippedSource_DoesNotCallDebuggerLaunch()
    {
        var root = FindRepositoryRoot();
        Assert.NotNull(root);

        var offenders = Directory
            .EnumerateFiles(root!, "*.cs", SearchOption.AllDirectories)
            .Where(IsShippedSource)
            .Where(ContainsForbiddenCall)
            .ToList();

        Assert.True(
            offenders.Count == 0,
            $"Debugger.Launch found in shipped source:{Environment.NewLine}{string.Join(Environment.NewLine, offenders)}");
    }

    private static bool IsShippedSource(string path)
    {
        var normalized = path.Replace('\\', '/');
        if (normalized.Contains("/obj/") || normalized.Contains("/bin/"))
            return false;

        // Test code (including this guard) is not shipped.
        return !normalized.Contains("/ledger12.Tests/");
    }

    private static bool ContainsForbiddenCall(string path) =>
        File.ReadAllText(path).Contains(ForbiddenCall, StringComparison.Ordinal);

    private static string? FindRepositoryRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "ledger12.slnx")))
                return dir.FullName;
            dir = dir.Parent;
        }
        return null;
    }
}
