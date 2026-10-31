using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Requests;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Data.Seed;

/// <summary>
/// Seeds the demo story for The Core Group's creative studio (D54): the Studio and Marketing teams serving the group's
/// brands, briefs with job codes and their deliverables, six weeks of bookings, leave, public holidays and briefs
/// waiting in triage. Dates are relative to the week the seed runs. People are fictional.
/// </summary>
public sealed partial class DemoSeeder(JuggleDbContext db, OrgClock clock, ILogger<DemoSeeder> logger)
{
    /// <summary>The group's brands and their job code prefixes (D52).</summary>
    private static readonly (string Name, string Prefix)[] Brands =
    [
        ("CGA", "CGA"), ("DJI", "DJI"), ("ARP", "ARP"), ("Bambu Lab", "BAMBU"), ("InRetail", "INRETAIL"),
        ("Reloved", "RELOVED"), ("MS Surface", "MSS"), ("GoPro", "GOPRO"), ("CVM", "CVM"), ("CCB", "CCB"),
        ("CORE", "CORE"), ("Pure Electric", "PURE"), ("Mobile in Africa", "MIA"), ("Ultra Human", "ULTRA"),
    ];

    /// <summary>October, so October 2026 is Q1'27, as in the studio's job codes.</summary>
    private const int FinancialYearStartMonth = 10;

    public static async Task MigrateAndSeedAsync(IServiceProvider services, bool reset)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<JuggleDbContext>();
        if (reset)
        {
            await db.Database.EnsureDeletedAsync();
        }

        await db.Database.MigrateAsync();
        await scope.ServiceProvider.GetRequiredService<DemoSeeder>().SeedAsync();
    }

    public async Task SeedAsync()
    {
        if (await db.Organisations.IgnoreQueryFilters().AnyAsync())
        {
            LogAlreadySeeded(logger);
            return;
        }

        var today = clock.Today;
        var weekStart = today.StartOfWeek();

        var org = new Organisation
        {
            Name = "The Core Group",
            TimeZone = OrgClock.TimeZoneId,
            DepartmentLabel = "Brand",
            FinancialYearStartMonth = FinancialYearStartMonth,
        };
        db.Organisations.Add(org);

        // Brands and teams

        var brands = Brands.ToDictionary(
            b => b.Name,
            b => new Department { OrgId = org.Id, Name = b.Name, JobCodePrefix = b.Prefix });
        db.Departments.AddRange(brands.Values);

        // Colours are hues from the project palette under "Design" in CLAUDE.md.
        var studio = new Team { OrgId = org.Id, Name = "Studio", Colour = "#8a78d6" };
        var marketing = new Team { OrgId = org.Id, Name = "Marketing", Colour = "#3fa7a0" };
        db.Teams.AddRange(studio, marketing);

        // Users and people

        var avatarColours = new Queue<string>(
        [
            "#8a78d6", "#5b8def", "#d16b8f", "#6aa36f", "#d9a441", "#3fa7a0", "#e07a5f", "#7b8ea8", "#5b8def",
            "#d16b8f", "#6aa36f", "#d9a441", "#3fa7a0", "#e07a5f", "#8a78d6", "#7b8ea8", "#5b8def",
        ]);

        User AddUser(string name, string? brand = null, OrgRole orgRole = OrgRole.User)
        {
            var user = new User
            {
                OrgId = org.Id,
                Name = name,
                Email = $"{name.ToLowerInvariant().Replace(' ', '.')}@thecoregroup.example",
                OrgRole = orgRole,
                AvatarColour = avatarColours.Dequeue(),
                DepartmentId = brand is null ? null : brands[brand].Id,
            };
            db.Users.Add(user);
            return user;
        }

        Person AddPerson(User user, string jobTitle, decimal hoursPerDay, string[] skills, params (Team Team, TeamRole Role)[] teams)
        {
            var person = new Person { OrgId = org.Id, UserId = user.Id, JobTitle = jobTitle, HoursPerDay = hoursPerDay, Skills = [.. skills] };
            db.People.Add(person);
            foreach (var (team, role) in teams)
            {
                db.TeamMemberships.Add(new TeamMembership { OrgId = org.Id, UserId = user.Id, TeamId = team.Id, Role = role });
            }

            return person;
        }

        var naledi = AddPerson(AddUser("Naledi Khumalo", orgRole: OrgRole.OrgAdmin), "Head of Studio", 8, ["Art direction", "Retail"], (studio, TeamRole.TeamAdmin));
        var ethan = AddPerson(AddUser("Ethan Pillay"), "Senior Designer", 8, ["Digital", "E-commerce"], (studio, TeamRole.Member));
        var lerato = AddPerson(AddUser("Lerato Mokoena"), "Senior Designer", 8, ["Retail", "Campaigns", "Print"], (studio, TeamRole.Member));
        var jason = AddPerson(AddUser("Jason van Wyk"), "Brand Designer", 8, ["Campaigns", "Social"], (studio, TeamRole.Member), (marketing, TeamRole.Member));
        var amahle = AddPerson(AddUser("Amahle Dlamini"), "Motion Designer", 8, ["Motion", "Video"], (studio, TeamRole.Member));
        var ruben = AddPerson(AddUser("Ruben Fourie"), "Artworker", 5, ["Print", "Artwork"], (studio, TeamRole.Member));
        var priya = AddPerson(AddUser("Priya Naidoo"), "Junior Designer", 8, ["Digital", "Social"], (studio, TeamRole.Member));
        var sipho = AddPerson(AddUser("Sipho Ndlovu"), "Digital Designer", 8, ["E-commerce", "Banners"], (studio, TeamRole.Member));
        var megan = AddPerson(AddUser("Megan Botha"), "Marketing Lead", 8, ["Strategy", "Copywriting"], (marketing, TeamRole.TeamAdmin));
        var thabo = AddPerson(AddUser("Thabo Mahlangu"), "Content Marketer", 8, ["Copywriting", "Email"], (marketing, TeamRole.Member));
        var chloe = AddPerson(AddUser("Chloe Adams"), "Social Media Manager", 8, ["Social", "Community"], (marketing, TeamRole.Member));

        // The brands' marketing managers brief the studio; they are not in a team.
        var zanele = AddUser("Zanele Mthembu", "DJI");
        var pieter = AddUser("Pieter Smit", "GoPro");
        var ayesha = AddUser("Ayesha Moosa", "Bambu Lab");
        var kagiso = AddUser("Kagiso Molefe", "Pure Electric");
        var nicole = AddUser("Nicole Jacobs", "MS Surface");
        var bongani = AddUser("Bongani Zulu", "Ultra Human");

        // Workflow statuses

        Dictionary<string, WorkflowStatus> AddStatuses(Team team, params (string Name, StatusCategory Category)[] statuses)
        {
            var created = statuses
                .Select((s, i) => new WorkflowStatus { OrgId = org.Id, TeamId = team.Id, Name = s.Name, Order = i + 1, Category = s.Category })
                .ToList();
            db.WorkflowStatuses.AddRange(created);
            return created.ToDictionary(s => s.Name);
        }

        // The studio's own statuses (D49): sent back from either review column bumps the round.
        var ss = AddStatuses(studio,
            ("Triage", StatusCategory.Todo),
            ("Briefed in", StatusCategory.Todo),
            ("Working on it", StatusCategory.InProgress),
            ("Feedback needed", StatusCategory.Review),
            ("Awaiting approval", StatusCategory.Review),
            ("Done", StatusCategory.Done));

        var ms = AddStatuses(marketing,
            ("Triage", StatusCategory.Todo),
            ("Planned", StatusCategory.Todo),
            ("Writing", StatusCategory.InProgress),
            ("Review", StatusCategory.Review),
            ("Scheduled", StatusCategory.Done),
            ("Published", StatusCategory.Done));

        // Projects: one per brief, named with its job code

        // A due date `days` from today, moved off weekends (back for past dates, forward for future ones).
        DateOnly Due(int days)
        {
            var date = today.AddDays(days);
            while (date.IsWeekend())
            {
                date = date.AddDays(days < 0 ? -1 : 1);
            }

            return date;
        }

        Project AddBrief(Team team, string brand, int number, string jobName, string colour, int dueDays)
        {
            var due = Due(dueDays);
            var project = new Project
            {
                OrgId = org.Id,
                TeamId = team.Id,
                DepartmentId = brands[brand].Id,
                Name = JobCodes.Name(brands[brand].JobCodePrefix!, number, due, FinancialYearStartMonth, jobName),
                Colour = colour,
                DueDate = due,
            };
            db.Projects.Add(project);
            return project;
        }

        var blackFriday = AddBrief(studio, "DJI", 141, "Black Friday", "#d9a441", 21);
        var brandStore = AddBrief(studio, "DJI", 142, "Amazon Brand Store", "#5b8def", 35);
        var festiveBundles = AddBrief(studio, "GoPro", 213, "Festive Bundles", "#3fa7a0", 28);
        var giftGuide = AddBrief(studio, "Bambu Lab", 57, "Holiday Gift Guide", "#6aa36f", 24);
        var summer = AddBrief(studio, "Pure Electric", 34, "Summer Campaign", "#e07a5f", 42);
        var backToSchool = AddBrief(studio, "MS Surface", 98, "Back to School", "#8a78d6", 70);
        var retailLaunch = AddBrief(studio, "Ultra Human", 22, "Retail Launch", "#d16b8f", 30);
        var storeRefresh = AddBrief(studio, "InRetail", 102, "Store Refresh", "#7b8ea8", 40);
        var popUp = AddBrief(studio, "Reloved", 15, "Festive Pop-up", "#d9a441", -5);
        var summit = AddBrief(studio, "Mobile in Africa", 29, "Summit Presentation", "#5b8def", 25);
        var newsletter = AddBrief(marketing, "CORE", 12, "Group Newsletter", "#3fa7a0", 25);
        var socialCalendar = AddBrief(marketing, "GoPro", 214, "Social Calendar", "#5b8def", 30);
        var caseStudies = AddBrief(marketing, "CGA", 61, "Dealer Case Studies", "#6aa36f", 35);
        var riderStories = AddBrief(marketing, "Pure Electric", 35, "Rider Stories", "#3fa7a0", 40);

        // Tasks: the briefs' deliverables

        var nextSortOrder = new Dictionary<Guid, int>();

        TaskItem AddTask(Project project, string title, WorkflowStatus status, Person? assignee, decimal estimate, int dueDays, int reviewCycle = 1)
        {
            var sortOrder = nextSortOrder.GetValueOrDefault(status.Id);
            nextSortOrder[status.Id] = sortOrder + 1;
            var task = new TaskItem
            {
                OrgId = org.Id,
                TeamId = project.TeamId,
                ProjectId = project.Id,
                Title = title,
                StatusId = status.Id,
                AssigneePersonId = assignee?.Id,
                EstimateHours = estimate,
                DueDate = Due(dueDays),
                ReviewCycle = reviewCycle,
                SortOrder = sortOrder,
            };
            db.Tasks.Add(task);
            return task;
        }

        // Lerato carries far more open deliverables than anyone else; six wait in Awaiting approval; four are overdue.
        var takealotBanners = AddTask(blackFriday, "Takealot banners", ss["Awaiting approval"], lerato, 8, 2, reviewCycle: 2);
        AddTask(blackFriday, "iStore banners", ss["Working on it"], lerato, 6, 4);
        AddTask(blackFriday, "Bellyband", ss["Feedback needed"], lerato, 4, -1, reviewCycle: 2);
        AddTask(blackFriday, "Cameraland video", ss["Working on it"], amahle, 16, 8);
        AddTask(blackFriday, "Generic assets", ss["Working on it"], lerato, 10, 6);
        AddTask(blackFriday, "A4 insert: Incredible Connection", ss["Awaiting approval"], ruben, 3, 1);
        AddTask(blackFriday, "A4 insert: Cameraland", ss["Awaiting approval"], ruben, 3, 1);
        AddTask(blackFriday, "A4 insert: Kloppers", ss["Briefed in"], ruben, 3, 5);
        AddTask(blackFriday, "A4 insert: ODP", ss["Briefed in"], lerato, 3, 5);
        AddTask(brandStore, "Brand store hero banners", ss["Working on it"], ethan, 12, 9);
        AddTask(brandStore, "Product tiles", ss["Briefed in"], lerato, 10, 14);
        AddTask(brandStore, "A+ content modules", ss["Briefed in"], sipho, 12, 16);
        AddTask(brandStore, "Store navigation wireframe", ss["Done"], ethan, 6, -6);
        var bundlePackshots = AddTask(festiveBundles, "Bundle packshots", ss["Awaiting approval"], sipho, 6, 3, reviewCycle: 2);
        AddTask(festiveBundles, "Takealot bundle banners", ss["Working on it"], sipho, 8, 7);
        AddTask(festiveBundles, "Social cut-downs", ss["Working on it"], amahle, 10, 10);
        AddTask(festiveBundles, "In-store wobblers", ss["Briefed in"], ruben, 4, 12);
        var giftGuideLayout = AddTask(giftGuide, "Gift guide layout", ss["Working on it"], lerato, 12, 6);
        AddTask(giftGuide, "Printer hero renders", ss["Feedback needed"], ethan, 8, -2, reviewCycle: 3);
        AddTask(giftGuide, "Email header set", ss["Done"], priya, 3, -4);
        AddTask(giftGuide, "Social carousel", ss["Briefed in"], priya, 6, 13);
        AddTask(summer, "Campaign key visual", ss["Working on it"], jason, 16, 8);
        AddTask(summer, "Billboard adaptation", ss["Briefed in"], jason, 8, 15);
        AddTask(summer, "Social launch tiles", ss["Feedback needed"], jason, 6, -1);
        AddTask(summer, "Scooter spec sheets", ss["Awaiting approval"], priya, 4, 2);
        AddTask(summer, "Rider safety leaflet", ss["Done"], ruben, 4, -9);
        AddTask(backToSchool, "Retailer toolkit", ss["Briefed in"], ethan, 14, 30);
        AddTask(backToSchool, "Campus poster series", ss["Briefed in"], sipho, 8, 35);
        AddTask(retailLaunch, "Launch concept boards", ss["Awaiting approval"], naledi, 8, 1, reviewCycle: 2);
        AddTask(retailLaunch, "Retail launch video", ss["Working on it"], amahle, 14, 12);
        AddTask(retailLaunch, "Shelf strips", ss["Briefed in"], ruben, 3, 18);
        AddTask(storeRefresh, "Window graphics", ss["Working on it"], naledi, 10, 10);
        AddTask(storeRefresh, "Store signage pack", ss["Feedback needed"], lerato, 8, -3);
        AddTask(popUp, "Pop-up stand graphics", ss["Done"], sipho, 10, -12);
        AddTask(popUp, "Price tags and swing tickets", ss["Done"], priya, 3, -7);
        AddTask(summit, "Summit presentation template", ss["Working on it"], ethan, 8, 5);
        AddTask(summit, "Speaker social tiles", ss["Briefed in"], null, 4, 20);

        AddTask(newsletter, "November newsletter copy", ms["Writing"], thabo, 6, 6);
        AddTask(newsletter, "Subscriber survey", ms["Planned"], thabo, 4, 15);
        AddTask(newsletter, "October newsletter", ms["Published"], thabo, 6, -6);
        AddTask(socialCalendar, "November social calendar", ms["Review"], chloe, 5, 3, reviewCycle: 2);
        AddTask(socialCalendar, "Instagram reels plan", ms["Writing"], chloe, 6, 8);
        AddTask(socialCalendar, "LinkedIn carousel graphics", ms["Planned"], jason, 6, 10);
        AddTask(socialCalendar, "Weekly social posts", ms["Scheduled"], chloe, 4, 1);
        AddTask(caseStudies, "Case study: Karoo Motors", ms["Writing"], megan, 10, 12);
        AddTask(caseStudies, "Case study: Highveld Dealers", ms["Planned"], thabo, 10, 20);
        AddTask(riderStories, "Rider story video script", ms["Planned"], chloe, 6, 18);
        AddTask(riderStories, "Rider of the month post", ms["Review"], megan, 4, 4);
        AddTask(riderStories, "Launch recap blog", ms["Published"], jason, 3, -9);

        // Allocations: weeks -1 to 5 relative to this week; weekdays 0 (Mon) to 4 (Fri).
        // Lengths vary from two days to three weeks, with gaps, and the far weeks are lighter.

        void Allocate(Person person, Project project, int fromWeek, int fromDay, int toWeek, int toDay, decimal hoursPerDay) =>
            db.Allocations.Add(new Allocation
            {
                OrgId = org.Id,
                PersonId = person.Id,
                ProjectId = project.Id,
                StartDate = weekStart.AddDays((fromWeek * 7) + fromDay),
                EndDate = weekStart.AddDays((toWeek * 7) + toDay),
                HoursPerDay = hoursPerDay,
            });

        Allocate(naledi, retailLaunch, -1, 0, 1, 4, 3);
        Allocate(naledi, storeRefresh, 0, 0, 0, 4, 2);
        Allocate(naledi, summer, 2, 0, 3, 4, 2);
        Allocate(naledi, retailLaunch, 3, 0, 4, 2, 2);

        // Ethan is booked exactly 8h Tuesday to Friday next week, a full day for the demo's clash.
        Allocate(ethan, brandStore, -1, 0, 1, 4, 5);
        Allocate(ethan, summit, 0, 0, 0, 2, 2);
        Allocate(ethan, giftGuide, 1, 1, 2, 2, 3);
        Allocate(ethan, brandStore, 2, 3, 4, 4, 4);
        Allocate(ethan, backToSchool, 5, 0, 5, 3, 2);

        // Lerato is the overloaded designer: 11h on Tuesday to Friday this week and Monday to Wednesday next week,
        // so she is the only one over capacity this week.
        Allocate(lerato, blackFriday, -1, 0, 1, 4, 5);
        Allocate(lerato, giftGuide, 0, 0, 1, 2, 3);
        Allocate(lerato, storeRefresh, 0, 1, 0, 4, 3);
        Allocate(lerato, brandStore, 1, 0, 2, 2, 3);
        Allocate(lerato, giftGuide, 2, 0, 3, 4, 3);
        Allocate(lerato, storeRefresh, 3, 0, 4, 4, 5);

        // Jason's load is split across Studio and Marketing.
        Allocate(jason, summer, 0, 0, 2, 1, 4);
        Allocate(jason, socialCalendar, 0, 2, 2, 4, 2.5m);
        Allocate(jason, riderStories, 3, 0, 3, 4, 3);
        Allocate(jason, backToSchool, 4, 1, 5, 4, 4);

        Allocate(amahle, blackFriday, 0, 0, 2, 4, 6);
        Allocate(amahle, festiveBundles, 0, 3, 0, 4, 2);
        Allocate(amahle, retailLaunch, 3, 0, 4, 2, 4);

        Allocate(ruben, blackFriday, -1, 0, 1, 4, 2.5m);
        Allocate(ruben, festiveBundles, 0, 0, 1, 2, 2);
        Allocate(ruben, retailLaunch, 2, 0, 3, 1, 3);
        Allocate(ruben, summer, 4, 0, 5, 4, 2);

        // Priya is the under-loaded designer the demo assigns new work to. Next week she is at 50% (green), so the
        // demo's 16h booking (4h/day, Monday to Thursday) takes her to 90% (amber) while her 4 weeks stay under 50%.
        Allocate(priya, giftGuide, 0, 0, 1, 4, 2);
        Allocate(priya, summer, 0, 1, 0, 2, 2);
        Allocate(priya, summer, 1, 0, 1, 4, 2);
        Allocate(priya, giftGuide, 2, 0, 2, 4, 2);
        Allocate(priya, backToSchool, 3, 2, 4, 1, 3);

        Allocate(sipho, festiveBundles, -1, 0, 1, 4, 3);
        Allocate(sipho, brandStore, 0, 0, 2, 2, 2);
        Allocate(sipho, festiveBundles, 0, 3, 1, 1, 2);
        Allocate(sipho, backToSchool, 3, 2, 5, 1, 4);

        Allocate(megan, caseStudies, -1, 0, 1, 4, 3);
        Allocate(megan, riderStories, 0, 0, 2, 4, 2);
        Allocate(megan, newsletter, 2, 0, 2, 3, 2);
        Allocate(megan, caseStudies, 3, 0, 5, 4, 3);

        Allocate(thabo, newsletter, 0, 0, 1, 2, 4);
        Allocate(thabo, caseStudies, 0, 1, 2, 4, 2.5m);
        Allocate(thabo, newsletter, 3, 0, 4, 4, 4);

        Allocate(chloe, socialCalendar, -1, 0, 1, 4, 4);
        Allocate(chloe, riderStories, 0, 2, 1, 1, 2);
        Allocate(chloe, socialCalendar, 2, 0, 4, 4, 4);
        Allocate(chloe, riderStories, 5, 0, 5, 4, 3);

        // Leave and public holidays

        void AddLeave(Person person, int fromWeek, int fromDay, int toWeek, int toDay,
            TimeOffType type = TimeOffType.AnnualLeave, TimeOffStatus status = TimeOffStatus.Approved, string? note = null) =>
            db.TimeOff.Add(new TimeOff
            {
                OrgId = org.Id,
                PersonId = person.Id,
                StartDate = weekStart.AddDays((fromWeek * 7) + fromDay),
                EndDate = weekStart.AddDays((toWeek * 7) + toDay),
                Type = type,
                Status = status,
                Note = note,
            });

        // Two Studio people are on leave in the next weeks; Sipho's runs over a weekend. Thabo's sick leave reads
        // "Unavailable" to everyone but him and the admins (POPIA). Ethan's request waits for the Head of Studio.
        AddLeave(amahle, 1, 0, 1, 2);
        AddLeave(sipho, 2, 3, 3, 1);
        AddLeave(thabo, 0, 0, 0, 1, TimeOffType.SickLeave);
        AddLeave(ethan, 2, 3, 2, 4, status: TimeOffStatus.Pending, note: "Family wedding in Durban");

        foreach (var (date, name) in SouthAfricanHolidays.For(today.Year).Concat(SouthAfricanHolidays.For(today.Year + 1)))
        {
            db.TimeOff.Add(new TimeOff
            {
                OrgId = org.Id,
                StartDate = date,
                EndDate = date,
                Type = TimeOffType.PublicHoliday,
                Status = TimeOffStatus.Approved,
                Description = name,
            });
        }

        // Briefs, in the studio's template (D50). The marketing manager is the brand's, who sent it.

        var now = clock.Now;

        void AddBriefRequest(Team team, User manager, string jobName, string mainGoal, string deliverables, Priority priority, int dueDays,
            double ageHours, TaskItem? acceptedTask = null) =>
            db.Requests.Add(new Request
            {
                OrgId = org.Id,
                TeamId = team.Id,
                RequesterUserId = manager.Id,
                DepartmentId = manager.DepartmentId!.Value,
                MarketingManagerUserId = manager.Id,
                Title = jobName,
                MainGoal = mainGoal,
                Deliverables = deliverables,
                RequestedDueDate = Due(dueDays),
                Priority = priority,
                Status = acceptedTask is null ? RequestStatus.New : RequestStatus.Accepted,
                TaskId = acceptedTask?.Id,
                CreatedAt = now.AddHours(-ageHours),
            });

        AddBriefRequest(studio, pieter, "Summer Adventure",
            "Launch the summer adventure push across retail and social, driving accessory bundle sales before the holidays.",
            "Takealot banners\nSocial tiles x6\nIn-store poster A2\nEmail header", Priority.High, 14, 3);
        AddBriefRequest(studio, ayesha, "Back to School Maker Kits",
            "Position the printers as the tool for school projects in January, with parents and teachers.",
            "A4 insert: Incredible Connection\nSocial carousel\nTakealot banners", Priority.Medium, 21, 20);
        AddBriefRequest(studio, kagiso, "Commuter Range Price Drop",
            "Announce the commuter range price drop in store and online before month end.",
            "Price drop banners\nShelf talkers\nWebsite hero", Priority.Urgent, 7, 28);
        AddBriefRequest(studio, nicole, "Business Roadshow",
            "Support the sales team's roadshow to corporate buyers in Johannesburg and Cape Town.",
            "Presentation template\nPull-up banner\nA5 leave-behind flyer", Priority.Medium, 18, 50);
        AddBriefRequest(studio, bongani, "Festive Gifting",
            "Make the ring the festive gift for health-conscious shoppers.",
            "Social tiles x8\nInstagram stories x4\nInfluencer brief one-pager", Priority.Medium, 12, 70);
        AddBriefRequest(marketing, zanele, "Brand Store Launch Post",
            "Tell South African shoppers the brand store is open on Amazon.",
            "Blog post\nNewsletter feature\nLinkedIn post", Priority.Medium, 10, 6);
        AddBriefRequest(marketing, kagiso, "Rider Community Newsletter",
            "Grow the rider community with a monthly newsletter of routes, tips and rider stories.",
            "Newsletter template\nFirst issue copy", Priority.High, 14, 30);
        AddBriefRequest(studio, zanele, "Black Friday",
            "Win Black Friday at the main retailers with one look across online and in store.",
            "Takealot banners\niStore banners\nBellyband\nCameraland video\nGeneric assets\nA4 inserts for retailers",
            Priority.High, 21, 200, takealotBanners);
        AddBriefRequest(studio, ayesha, "Holiday Gift Guide",
            "A gift guide that makes the printers the easy festive gift.",
            "Gift guide layout\nPrinter hero renders\nEmail header set\nSocial carousel", Priority.Medium, 24, 220, giftGuideLayout);
        AddBriefRequest(studio, pieter, "Festive Bundles",
            "Sell the festive camera bundles on Takealot and in store.",
            "Bundle packshots\nTakealot bundle banners\nSocial cut-downs\nIn-store wobblers", Priority.High, 28, 260, bundlePackshots);

        await db.SaveChangesAsync();
        LogSeeded(logger, weekStart);
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Demo data already present, skipping seed")]
    private static partial void LogAlreadySeeded(ILogger logger);

    [LoggerMessage(Level = LogLevel.Information, Message = "Seeded demo data for the week of {WeekStart}")]
    private static partial void LogSeeded(ILogger logger, DateOnly weekStart);
}
