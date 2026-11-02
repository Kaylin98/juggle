using Juggle.Api.Common;

namespace Juggle.Api.Features.Files;

/// <summary>What an upload may be: common documents, images, PDFs and videos, up to 25 MB.</summary>
public static class FileRules
{
    public const long MaxBytes = 25 * 1024 * 1024;

    /// <summary>A request carries the file plus a little form overhead.</summary>
    public const long MaxRequestBytes = MaxBytes + 1024 * 1024;

    // The type comes from the extension, never from what the browser says it is.
    private static readonly Dictionary<string, string> ContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"] = "application/pdf",
        [".doc"] = "application/msword",
        [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        [".xls"] = "application/vnd.ms-excel",
        [".xlsx"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        [".ppt"] = "application/vnd.ms-powerpoint",
        [".pptx"] = "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        [".txt"] = "text/plain",
        [".csv"] = "text/csv",
        [".rtf"] = "application/rtf",
        [".png"] = "image/png",
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".gif"] = "image/gif",
        [".webp"] = "image/webp",
        [".svg"] = "image/svg+xml",
        [".mp4"] = "video/mp4",
        [".m4v"] = "video/mp4",
        [".mov"] = "video/quicktime",
        [".webm"] = "video/webm",
    };

    /// <summary>Images and PDFs can open in the browser; everything else downloads.</summary>
    public static bool OpensInBrowser(string contentType) => contentType.StartsWith("image/", StringComparison.Ordinal) || contentType == "application/pdf";

    /// <summary>The extensions for the browser's file picker.</summary>
    public static string Accept => string.Join(',', ContentTypes.Keys);

    /// <summary>The file's content type, or a 400 saying why it can't be uploaded.</summary>
    public static string Validate(IFormFile? file)
    {
        if (file is null || file.Length == 0)
        {
            throw new BadRequestException("Choose a file to upload.");
        }
        if (file.Length > MaxBytes)
        {
            throw new BadRequestException("A file can be at most 25 MB.");
        }

        return ContentTypes.TryGetValue(Path.GetExtension(file.FileName), out var contentType)
            ? contentType
            : throw new BadRequestException("That type of file can't be uploaded. Use a document, image, PDF or video.");
    }
}
