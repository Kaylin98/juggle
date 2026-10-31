namespace Juggle.Api.Features.Requests;

/// <summary>A brief's deliverables, typed one per line; each can become a task (D51).</summary>
public static class Deliverables
{
    /// <summary>The longest deliverable, so each fits a task title.</summary>
    public const int MaxLength = 200;

    /// <summary>The non-empty lines, trimmed and without a leading bullet, in the order given.</summary>
    public static IReadOnlyList<string> Parse(string? text) => (text ?? "")
        .Split('\n')
        .Select(line => line.Trim().TrimStart('-', '*', '•').Trim())
        .Where(line => line.Length > 0)
        .ToList();
}
