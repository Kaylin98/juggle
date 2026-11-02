using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Jobs;
using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Tests;

public sealed class FilesTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;
    private readonly DateOnly _start = new OrgClock(TimeProvider.System).Today.AddDays(7 * 60);

    [Fact]
    public async Task The_requester_attaches_a_file_and_everyone_who_can_see_the_job_downloads_it()
    {
        var (_, job) = await Briefs.AllocatedJobAsync(api, "Priya Naidoo", NextMonday(_start), _ct);
        var zanele = await api.SignInAsAsync("Zanele Mthembu");

        var uploaded = await UploadAsync(zanele, job.Id, "brief.pdf", "the brief"u8.ToArray(), FileKind.Brief);
        var detail = (await zanele.GetFromJsonAsync<JobDetailDto>($"/api/jobs/{job.Id}", ApiFactory.Json, _ct))!;

        Assert.Equal(HttpStatusCode.Created, uploaded.StatusCode);
        var file = Assert.Single(detail.Files);
        Assert.Equal(("brief.pdf", FileKind.Brief, 9L, "Zanele Mthembu"), (file.FileName, file.Kind, file.SizeBytes, file.UploadedByName));
        foreach (var name in new[] { "Zanele Mthembu", "Priya Naidoo", "Naledi Khumalo", "Chloe Adams" })
        {
            var response = await (await api.SignInAsAsync(name)).GetAsync($"/api/jobs/{job.Id}/files/{file.Id}", _ct);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("the brief", await response.Content.ReadAsStringAsync(_ct));
            Assert.Equal("application/pdf", response.Content.Headers.ContentType!.MediaType);
            Assert.Equal("attachment", response.Content.Headers.ContentDisposition!.DispositionType);
        }
    }

    [Fact]
    public async Task A_file_is_hidden_from_users_who_cannot_see_the_job_and_only_the_requester_attaches()
    {
        var (_, job) = await Briefs.AllocatedJobAsync(api, "Priya Naidoo", NextMonday(_start.AddDays(7)), _ct);
        var zanele = await api.SignInAsAsync("Zanele Mthembu");
        var fileId = (await (await UploadAsync(zanele, job.Id, "notes.txt", "notes"u8.ToArray(), FileKind.Supporting)).Content
            .ReadFromJsonAsync<JobFileDto>(ApiFactory.Json, _ct))!.Id;

        foreach (var name in new[] { "Thabo Mahlangu", "Ethan Pillay" })
        {
            var other = await api.SignInAsAsync(name);
            Assert.Equal(HttpStatusCode.Forbidden, (await other.GetAsync($"/api/jobs/{job.Id}/files/{fileId}", _ct)).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await UploadAsync(other, job.Id, "x.txt", "x"u8.ToArray(), FileKind.Supporting)).StatusCode);
        }
        var traffic = await api.SignInAsAsync("Chloe Adams");
        Assert.Equal(HttpStatusCode.Forbidden, (await UploadAsync(traffic, job.Id, "x.txt", "x"u8.ToArray(), FileKind.Supporting)).StatusCode);
    }

    [Fact]
    public async Task Files_over_25_MB_and_unsupported_types_are_refused()
    {
        var (_, job) = await Briefs.AllocatedJobAsync(api, "Priya Naidoo", NextMonday(_start.AddDays(14)), _ct);
        var zanele = await api.SignInAsAsync("Zanele Mthembu");

        var tooBig = await UploadAsync(zanele, job.Id, "big.mp4", new byte[(25 * 1024 * 1024) + 1], FileKind.Supporting);
        var program = await UploadAsync(zanele, job.Id, "setup.exe", "MZ"u8.ToArray(), FileKind.Supporting);
        var atLimit = await UploadAsync(zanele, job.Id, "ok.mp4", new byte[25 * 1024 * 1024], FileKind.Supporting);
        var artwork = await UploadAsync(zanele, job.Id, "a.png", "x"u8.ToArray(), FileKind.Artwork);

        Assert.Equal(HttpStatusCode.BadRequest, tooBig.StatusCode);
        Assert.Equal("A file can be at most 25 MB.", (await tooBig.Content.ReadFromJsonAsync<ProblemDetails>(_ct))!.Detail);
        Assert.Equal(HttpStatusCode.BadRequest, program.StatusCode);
        Assert.Equal(HttpStatusCode.Created, atLimit.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, artwork.StatusCode);
    }

    [Fact]
    public async Task An_artwork_file_reaches_the_requester_only_after_the_head_of_design_approves_it()
    {
        var (_, job) = await Briefs.AllocatedJobAsync(api, "Priya Naidoo", NextMonday(_start.AddDays(21)), _ct);
        var priya = await api.SignInAsAsync("Priya Naidoo");
        var zanele = await api.SignInAsAsync("Zanele Mthembu");
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        (await priya.PostAsync($"/api/jobs/{job.Id}/start", null, _ct)).EnsureSuccessStatusCode();

        using var form = new MultipartFormDataContent { { new ByteArrayContent("artwork"u8.ToArray()), "file", "v1.png" }, { new StringContent("First cut"), "note" } };
        var submitted = await priya.PostAsync($"/api/jobs/{job.Id}/submit-artwork-file", form, _ct);

        Assert.Equal(HttpStatusCode.OK, submitted.StatusCode);
        var fileId = (await priya.GetFromJsonAsync<JobDetailDto>($"/api/jobs/{job.Id}", ApiFactory.Json, _ct))!.Artwork.Single().File!.Id;
        Assert.Equal(HttpStatusCode.OK, (await priya.GetAsync($"/api/jobs/{job.Id}/files/{fileId}", _ct)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await naledi.GetAsync($"/api/jobs/{job.Id}/files/{fileId}", _ct)).StatusCode);
        Assert.Empty((await zanele.GetFromJsonAsync<JobDetailDto>($"/api/jobs/{job.Id}", ApiFactory.Json, _ct))!.Artwork);
        Assert.Equal(HttpStatusCode.Forbidden, (await zanele.GetAsync($"/api/jobs/{job.Id}/files/{fileId}", _ct)).StatusCode);

        (await naledi.PostAsJsonAsync($"/api/jobs/{job.Id}/approve-design", new { comment = (string?)null }, ApiFactory.Json, _ct)).EnsureSuccessStatusCode();

        var visible = (await zanele.GetFromJsonAsync<JobDetailDto>($"/api/jobs/{job.Id}", ApiFactory.Json, _ct))!.Artwork.Single();
        Assert.Equal(("v1.png", null, "First cut"), (visible.File!.FileName, visible.Url, visible.Note));
        Assert.Equal(HttpStatusCode.OK, (await zanele.GetAsync($"/api/jobs/{job.Id}/files/{fileId}", _ct)).StatusCode);
    }

    [Fact]
    public async Task Artwork_files_are_submitted_only_by_the_designer_at_the_right_step_and_in_an_allowed_type()
    {
        var (_, job) = await Briefs.AllocatedJobAsync(api, "Priya Naidoo", NextMonday(_start.AddDays(28)), _ct);
        var priya = await api.SignInAsAsync("Priya Naidoo");
        var ethan = await api.SignInAsAsync("Ethan Pillay");
        (await priya.PostAsync($"/api/jobs/{job.Id}/start", null, _ct)).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Forbidden, (await SubmitFileAsync(ethan, job.Id, "v1.png")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await SubmitFileAsync(priya, job.Id, "v1.exe")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await SubmitFileAsync(priya, job.Id, "v1.png")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await SubmitFileAsync(priya, job.Id, "v2.png")).StatusCode);
    }

    private Task<HttpResponseMessage> SubmitFileAsync(HttpClient client, Guid jobId, string name)
    {
        var form = new MultipartFormDataContent { { new ByteArrayContent("a"u8.ToArray()), "file", name } };
        return client.PostAsync($"/api/jobs/{jobId}/submit-artwork-file", form, _ct);
    }

    private Task<HttpResponseMessage> UploadAsync(HttpClient client, Guid jobId, string name, byte[] bytes, FileKind kind)
    {
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        var form = new MultipartFormDataContent { { content, "file", name }, { new StringContent(kind.ToString()), "kind" } };
        return client.PostAsync($"/api/jobs/{jobId}/files", form, _ct);
    }

    /// <summary>A Monday, so the one-hour booking made with each job lands on a working day.</summary>
    private static DateOnly NextMonday(DateOnly date) => date.AddDays((8 - (int)date.DayOfWeek) % 7);
}
