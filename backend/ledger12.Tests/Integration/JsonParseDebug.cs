using System.Text.Json;

var jsonPath = Path.GetFullPath(
    Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "import-data", "backup-2026-06-29.json"));
var json = await File.ReadAllTextAsync(jsonPath);

// Method 1: Deserialize<Dictionary<string, object?>>
var data1 = JsonSerializer.Deserialize<Dictionary<string, object?>>(json)!;
Console.WriteLine("=== Method 1: Deserialize<Dictionary<string, object?>> ===");
foreach (var kvp in data1)
{
    var val = kvp.Value;
    Console.WriteLine($"  {kvp.Key}: type={val?.GetType().FullName ?? "null"}, isJsonElement={val is JsonElement}");
    if (val is JsonElement je)
    {
        Console.WriteLine($"    ValueKind={je.ValueKind}");
        if (je.ValueKind == JsonValueKind.Array)
            Console.WriteLine($"    Array length hint (first 3): {string.Join(", ", je.EnumerateArray().Take(3).Select(e => e.TryGetProperty("name", out var n) ? n.GetString() : "?"))}");
    }
}

// Method 2: JsonDocument
using var doc = JsonDocument.Parse(json);
Console.WriteLine("\n=== Method 2: JsonDocument ===");
foreach (var prop in doc.RootElement.EnumerateObject())
{
    Console.WriteLine($"  {prop.Name}: ValueKind={prop.Value.ValueKind}");
    if (prop.Value.ValueKind == JsonValueKind.Array)
        Console.WriteLine($"    Count check: {string.Join(", ", prop.Value.EnumerateArray().Take(3).Select(e => e.TryGetProperty("name", out var n) ? n.GetString() : "?"))}");
}
