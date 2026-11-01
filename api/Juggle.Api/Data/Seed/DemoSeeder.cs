using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Requests;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Data.Seed;

/// <summary>
/// Seeds The Core Group, the first organisation's configuration and demo story (D73, D77): its roles and their
/// capabilities, terms, the design studio serving the group's brands, briefs with job codes and their deliverables,
/// six weeks of bookings, leave, public holidays and briefs waiting in triage. Dates are relative to the week the seed
/// runs. People are fictional.
/// </summary>
public sealed partial class DemoSeeder(JuggleDbContext db, OrgClock clock, ILogger<DemoSeeder> logger)
{
    /// <summary>
    /// The group's brands, their job code prefixes (D52) and colours (D61). 14 brands share 8 hues; on the board only
    /// Reloved (whose work is all done) and Mobile in Africa share amber.
    /// </summary>
    private static readonly (string Name, string Prefix, string Colour)[] Brands =
    [
        ("CGA", "CGA", "#d9a441"), ("DJI", "DJI", "#5b8def"), ("ARP", "ARP", "#7b8ea8"), ("Bambu Lab", "BAMBU", "#6aa36f"),
        ("InRetail", "INRETAIL", "#7b8ea8"), ("Reloved", "RELOVED", "#d9a441"), ("MS Surface", "MSS", "#8a78d6"),
        ("GoPro", "GOPRO", "#3fa7a0"), ("CVM", "CVM", "#d16b8f"), ("CCB", "CCB", "#6aa36f"), ("CORE", "CORE", "#8a78d6"),
        ("Pure Electric", "PURE", "#e07a5f"), ("Mobile in Africa", "MIA", "#d9a441"), ("Ultra Human", "ULTRA", "#d16b8f"),
    ];

    /// <summary>
    /// A brief from an earlier month: sent on day Day of the month MonthsAgo months back. A rejected brief has no
    /// project, so no job number (0).
    /// </summary>
    private sealed record PastBrief(
        string Brand, int Number, string JobName, int MonthsAgo, int Day, string MainGoal, string[] Deliverables,
        string? RejectionReason = null);

    /// <summary>Briefs delivered in the eight months before this one, by the brands with a marketing manager (D56).</summary>
    private static readonly PastBrief[] PastBriefs =
    [
        new("DJI", 125, "Valentine's Day", 8, 3, "Gifting for couples who travel.", ["Valentine's Takealot banners", "Couples gifting social tiles"]),
        new("GoPro", 196, "HERO12 Price Drop", 8, 9, "Announce the HERO12 price drop online.", ["Price drop web banners"]),
        new("MS Surface", 85, "Back to Work", 8, 14, "Surface for the return to the office.", ["Back to work email", "Retail shelf wobblers"]),
        new("Pure Electric", 22, "Autumn Commute", 8, 22, "Keep commuters riding as the weather turns.", ["Commuter print ad"]),
        new("DJI", 126, "Easter Specials", 7, 2, "Easter deals at the main retailers.", ["Easter Takealot banners", "Easter in-store posters"]),
        new("Bambu Lab", 44, "Maker Month", 7, 6, "A month of maker projects and workshops.", ["Maker Month social tiles", "Workshop flyer"]),
        new("Ultra Human", 12, "Ring Gen 2 Launch", 7, 11, "Launch the second-generation ring.",
            ["Launch hero visual", "Launch social cut-downs", "Unboxing leaflet"]),
        new("GoPro", 197, "Spring Adventure", 7, 17, "Get people outdoors with a GoPro this spring.", ["Spring adventure web hero"]),
        new("MS Surface", 86, "Education Bundles", 7, 24, "Bundles for schools and universities.", ["Education bundle brochure"]),
        new("DJI", 127, "Mini 4 Pro Launch", 6, 1, "Launch the Mini 4 Pro in store and online.",
            ["Mini 4 Pro hero banners", "Mini 4 Pro spec sheet", "Retail launch kit"]),
        new("Pure Electric", 23, "Easter Weekend Sale", 6, 8, "Easter weekend scooter deals.", ["Easter weekend web banners"]),
        new("Bambu Lab", 45, "A1 Mini Promo", 6, 15, "The A1 Mini as the first 3D printer.", ["A1 Mini Takealot banners", "A1 Mini email header"]),
        new("MS Surface", 87, "Surface Pro Trade-in", 6, 21, "Trade in an old laptop for a Surface Pro.", ["Trade-in in-store poster"]),
        new("DJI", 128, "Mother's Day", 5, 2, "Cameras for capturing family moments.", ["Mother's Day social tiles", "Mother's Day email header"]),
        new("GoPro", 198, "Ski Season", 5, 6, "GoPro on the slopes this winter.", ["Ski season social video", "Ski season store poster"]),
        new("Ultra Human", 13, "Wellness Month", 5, 9, "Daily wellness habits with the ring.", ["Wellness Month social carousel"]),
        new("Pure Electric", 24, "Winter Ready", 5, 14, "Riding safely through winter.", ["Winter Ready leaflet", "Winter Ready web hero"]),
        new("Bambu Lab", 46, "Filament Bundles", 5, 19, "Filament bundles for regular printers.", ["Filament bundle packshots"]),
        new("Bambu Lab", 0, "Trade Show Booth", 5, 21, "Our stand at the Maker Faire.", ["Booth graphics", "Banner stands"],
            RejectionReason: "The events agency is designing the booth this year."),
        new("MS Surface", 88, "Business Week", 5, 26, "Surface for small business owners.", ["Business Week presentation"]),
        new("DJI", 129, "Osmo Pocket 3 Launch", 4, 3, "Launch the Osmo Pocket 3 for creators.", ["Osmo Pocket 3 launch video", "Osmo Pocket 3 banners"]),
        new("GoPro", 199, "Father's Day", 4, 8, "GoPro as the Father's Day gift.", ["Father's Day Takealot banners", "Father's Day social tiles"]),
        new("MS Surface", 89, "Mid-year Sale", 4, 12, "Mid-year Surface deals.", ["Mid-year sale banners"]),
        new("Ultra Human", 14, "Sleep Challenge", 4, 18, "A 30-day sleep challenge with the ring.",
            ["Sleep challenge social tiles", "Sleep challenge landing page"]),
        new("Bambu Lab", 48, "Schools Programme", 4, 24, "3D printers in school classrooms.", ["Schools programme brochure"]),
        new("DJI", 130, "Winter Sale", 3, 1, "DJI's winter sale across all retailers.",
            ["Winter sale Takealot banners", "Winter sale store posters", "Winter sale email"]),
        new("Pure Electric", 25, "Scooter Safety Week", 3, 7, "Safe riding tips for every rider.", ["Safety week social tiles"]),
        new("GoPro", 200, "HERO13 Launch", 3, 10, "Launch the HERO13 Black.",
            ["HERO13 launch key visual", "HERO13 retail toolkit", "HERO13 launch video"]),
        new("MS Surface", 90, "Back to Campus", 3, 16, "Surface for the second semester.", ["Campus social tiles"]),
        new("Bambu Lab", 49, "X1 Carbon Promo", 3, 20, "The X1 Carbon for serious makers.", ["X1 Carbon web banners"]),
        new("Ultra Human", 15, "Corporate Wellness", 3, 25, "The ring for company wellness programmes.", ["Corporate wellness deck"]),
        new("DJI", 131, "Women's Day", 2, 2, "Celebrate women creators on Women's Day.", ["Women's Day social tiles"]),
        new("DJI", 132, "Avata 2 Launch", 2, 6, "Launch the Avata 2 FPV drone.", ["Avata 2 hero banners", "Avata 2 launch video"]),
        new("GoPro", 201, "Spring Break", 2, 11, "GoPro for the spring holidays.", ["Spring break social cut-downs"]),
        new("Pure Electric", 26, "Spring Commute", 2, 14, "Swap the car for a scooter this spring.", ["Spring commute billboard", "Spring commute web hero"]),
        new("Bambu Lab", 50, "Spring Makers", 2, 18, "Spring projects to print at home.", ["Spring Makers email", "Spring Makers social tiles"]),
        new("Ultra Human", 0, "Partner Webinar Slides", 2, 20, "Slides for the partner webinar.", ["Webinar slide deck"],
            RejectionReason: "Marketing is building these from the existing template."),
        new("MS Surface", 91, "Copilot+ PC Launch", 2, 22, "Launch Surface Copilot+ PCs in store.",
            ["Copilot+ launch banners", "Copilot+ in-store demo cards"]),
        new("Ultra Human", 17, "Fitness Month", 2, 26, "Train smarter with the ring.", ["Fitness Month social tiles"]),
        new("DJI", 133, "Heritage Day", 1, 2, "Show South Africa from above on Heritage Day.", ["Heritage Day social tiles"]),
        new("DJI", 134, "Neo Launch", 1, 5, "Launch the DJI Neo for first-time flyers.",
            ["Neo launch banners", "Neo launch social video", "Neo retail wobblers"]),
        new("GoPro", 202, "Summer Preview", 1, 8, "A first look at GoPro's summer range.", ["Summer preview web hero"]),
        new("Pure Electric", 27, "Rider Rewards", 1, 11, "Launch the rider rewards programme.", ["Rider Rewards leaflet", "Rider Rewards email"]),
        new("Bambu Lab", 51, "H2D Launch", 1, 15, "Launch the H2D printer.", ["H2D launch key visual", "H2D Takealot banners"]),
        new("MS Surface", 92, "Surface Laptop 7 Promo", 1, 18, "Surface Laptop 7 deals for professionals.", ["Surface Laptop 7 banners"]),
        new("Ultra Human", 18, "Spring Reset", 1, 22, "A spring reset for sleep and energy.", ["Spring Reset social carousel"]),
        new("MS Surface", 93, "Partner Day", 1, 25, "Surface's day with reseller partners.", ["Partner Day presentation", "Partner Day pull-up banner"]),
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
            BriefLabel = "Brief",
            JobLabel = "Job",
            FinancialYearStartMonth = FinancialYearStartMonth,
            WorkdayHours = 8,
            HolidayCountry = "ZA",
        };
        db.Organisations.Add(org);

        // Roles: The Core Group's five, and what each may do (D70, D77). Code checks the capabilities, never the names.

        var roleOrder = 0;
        Role AddRole(string name, params Capability[] capabilities)
        {
            var role = new Role { OrgId = org.Id, Name = name, Order = roleOrder++, Capabilities = [.. capabilities] };
            db.Roles.Add(role);
            return role;
        }

        var headOfMarketing = AddRole("Head of Marketing",
            Capability.ViewAllJobs, Capability.ViewBoard, Capability.ViewSchedule, Capability.ViewReports, Capability.ManageUsers);
        var headOfDesign = AddRole("Head of Design",
            Capability.ViewAllJobs, Capability.ViewBoard, Capability.ViewSchedule, Capability.ViewReports, Capability.ApproveDesign);
        var trafficManager = AddRole("Traffic Manager",
            Capability.ViewAllJobs, Capability.ViewBoard, Capability.ViewSchedule, Capability.ViewReports,
            Capability.TriageBriefs, Capability.Allocate, Capability.ApproveTimeOff);
        var designer = AddRole("Designer", Capability.ViewBoard, Capability.ViewReports, Capability.WorkOnJobs);
        var marketingManager = AddRole("Marketing Manager",
            Capability.SubmitBrief, Capability.ViewReports, Capability.ApproveMarketing, Capability.CloseJob);

        // Brands and the studio

        var brands = Brands.ToDictionary(
            b => b.Name,
            b => new Department { OrgId = org.Id, Name = b.Name, JobCodePrefix = b.Prefix, Colour = b.Colour });
        db.Departments.AddRange(brands.Values);

        // The colour is a hue from the palette under "Design" in CLAUDE.md.
        var studio = new Team { OrgId = org.Id, Name = "Design Studio", Colour = "#8a78d6" };
        db.Teams.Add(studio);

        // Users and people

        var avatarColours = new Queue<string>(
        [
            "#8a78d6", "#5b8def", "#d16b8f", "#6aa36f", "#d9a441", "#3fa7a0", "#e07a5f", "#7b8ea8", "#5b8def",
            "#d16b8f", "#6aa36f", "#d9a441", "#3fa7a0", "#e07a5f", "#8a78d6", "#7b8ea8", "#5b8def", "#d16b8f",
        ]);

        User AddUser(string name, Role role)
        {
            var user = new User
            {
                OrgId = org.Id,
                Name = name,
                Email = $"{name.ToLowerInvariant().Replace(' ', '.')}@thecoregroup.example",
                RoleId = role.Id,
                AvatarColour = avatarColours.Dequeue(),
            };
            db.Users.Add(user);
            return user;
        }

        // Only the designers are on the studio's schedule (D70).
        Person AddDesigner(string name, string jobTitle, string[] skills, decimal? hoursPerDay = null)
        {
            var user = AddUser(name, designer);
            var person = new Person
            {
                OrgId = org.Id,
                UserId = user.Id,
                JobTitle = jobTitle,
                HoursPerDay = hoursPerDay ?? org.WorkdayHours,
                Skills = [.. skills],
            };
            db.People.Add(person);
            db.TeamMemberships.Add(new TeamMembership { OrgId = org.Id, UserId = user.Id, TeamId = studio.Id });
            return person;
        }

        // A brand's marketing manager briefs the studio for their brands; one manager can cover several (D58).
        User AddManager(string name, params string[] managed)
        {
            var user = AddUser(name, marketingManager);
            foreach (var brand in managed)
            {
                db.DepartmentManagers.Add(new DepartmentManager { OrgId = org.Id, UserId = user.Id, DepartmentId = brands[brand].Id });
            }

            return user;
        }

        AddUser("Megan Botha", headOfMarketing);
        AddUser("Naledi Khumalo", headOfDesign);
        AddUser("Chloe Adams", trafficManager);

        var ethan = AddDesigner("Ethan Pillay", "Senior Designer", ["Digital", "E-commerce"]);
        var lerato = AddDesigner("Lerato Mokoena", "Senior Designer", ["Retail", "Campaigns", "Print"]);
        var amahle = AddDesigner("Amahle Dlamini", "Motion Designer", ["Motion", "Video"]);
        var ruben = AddDesigner("Ruben Fourie", "Artworker", ["Print", "Artwork"], hoursPerDay: 5);
        var priya = AddDesigner("Priya Naidoo", "Junior Designer", ["Digital", "Social"]);
        var sipho = AddDesigner("Sipho Ndlovu", "Digital Designer", ["E-commerce", "Banners"]);

        var zanele = AddManager("Zanele Mthembu", "DJI", "Pure Electric");
        var pieter = AddManager("Pieter Smit", "GoPro");
        var ayesha = AddManager("Ayesha Moosa", "Bambu Lab");
        var nicole = AddManager("Nicole Jacobs", "MS Surface");
        var bongani = AddManager("Bongani Zulu", "Ultra Human");
        AddManager("Thabo Mahlangu", "CORE", "CGA");
        AddManager("Lindiwe Khoza", "InRetail", "Reloved");
        AddManager("Werner Steyn", "ARP", "CVM");
        AddManager("Fatima Patel", "Mobile in Africa", "CCB");
        var managerOf = new Dictionary<string, User>
        {
            ["DJI"] = zanele, ["Pure Electric"] = zanele, ["GoPro"] = pieter, ["Bambu Lab"] = ayesha,
            ["MS Surface"] = nicole, ["Ultra Human"] = bongani,
        };

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

        Project AddBrief(Team team, string brand, int number, string jobName, int dueDays)
        {
            var due = Due(dueDays);
            var project = new Project
            {
                OrgId = org.Id,
                TeamId = team.Id,
                DepartmentId = brands[brand].Id,
                Name = JobCodes.Name(brands[brand].JobCodePrefix!, number, due, FinancialYearStartMonth, jobName),
                DueDate = due,
            };
            db.Projects.Add(project);
            return project;
        }

        var blackFriday = AddBrief(studio, "DJI", 141, "Black Friday", 21);
        var brandStore = AddBrief(studio, "DJI", 142, "Amazon Brand Store", 35);
        var festiveBundles = AddBrief(studio, "GoPro", 213, "Festive Bundles", 28);
        var giftGuide = AddBrief(studio, "Bambu Lab", 57, "Holiday Gift Guide", 24);
        var summer = AddBrief(studio, "Pure Electric", 34, "Summer Campaign", 42);
        var backToSchool = AddBrief(studio, "MS Surface", 98, "Back to School", 70);
        var retailLaunch = AddBrief(studio, "Ultra Human", 22, "Retail Launch", 30);
        var storeRefresh = AddBrief(studio, "InRetail", 102, "Store Refresh", 40);
        var popUp = AddBrief(studio, "Reloved", 15, "Festive Pop-up", -5);
        var summit = AddBrief(studio, "Mobile in Africa", 29, "Summit Presentation", 25);

        // Tasks: the briefs' deliverables

        var nextSortOrder = new Dictionary<Guid, int>();

        TaskItem AddTask(Project project, string title, WorkflowStatus status, Person? assignee, decimal estimate, int dueDays,
            int reviewCycle = 1, string? feedback = null)
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
                Feedback = feedback,
            };
            db.Tasks.Add(task);
            return task;
        }

        // Lerato carries far more open deliverables than anyone else; six wait in Awaiting approval; four are overdue.
        // Cards in Feedback needed were sent back by the brand's manager, so they are on round 2 or more with the
        // feedback (D58). The first deliverable of each brief that came in as a request is kept, to link the request to it.
        var takealotBanners = AddTask(blackFriday, "Takealot banners", ss["Awaiting approval"], lerato, 8, 2, reviewCycle: 2);
        AddTask(blackFriday, "iStore banners", ss["Working on it"], lerato, 6, 4);
        AddTask(blackFriday, "Bellyband", ss["Feedback needed"], lerato, 4, -1, reviewCycle: 2,
            feedback: "Use the Black Friday lock-up from the key visual, and make the price the hero.");
        AddTask(blackFriday, "Cameraland video", ss["Working on it"], amahle, 16, 8);
        AddTask(blackFriday, "Generic assets", ss["Working on it"], lerato, 10, 6);
        AddTask(blackFriday, "A4 insert: Incredible Connection", ss["Awaiting approval"], ruben, 3, 1);
        AddTask(blackFriday, "A4 insert: Cameraland", ss["Awaiting approval"], ruben, 3, 1);
        AddTask(blackFriday, "A4 insert: Kloppers", ss["Briefed in"], ruben, 3, 5);
        AddTask(blackFriday, "A4 insert: ODP", ss["Briefed in"], lerato, 3, 5);
        var heroBanners = AddTask(brandStore, "Brand store hero banners", ss["Working on it"], ethan, 12, 9);
        AddTask(brandStore, "Product tiles", ss["Briefed in"], lerato, 10, 14);
        AddTask(brandStore, "A+ content modules", ss["Briefed in"], sipho, 12, 16);
        AddTask(brandStore, "Store navigation wireframe", ss["Done"], ethan, 6, -6);
        var bundlePackshots = AddTask(festiveBundles, "Bundle packshots", ss["Awaiting approval"], sipho, 6, 3, reviewCycle: 2);
        AddTask(festiveBundles, "Takealot bundle banners", ss["Working on it"], sipho, 8, 7);
        AddTask(festiveBundles, "Social cut-downs", ss["Working on it"], amahle, 10, 10);
        AddTask(festiveBundles, "In-store wobblers", ss["Briefed in"], ruben, 4, 12);
        var giftGuideLayout = AddTask(giftGuide, "Gift guide layout", ss["Working on it"], lerato, 12, 6);
        AddTask(giftGuide, "Printer hero renders", ss["Feedback needed"], ethan, 8, -2, reviewCycle: 3,
            feedback: "Closer, but the printer still looks grey. Warm up the lighting and show a finished print beside it.");
        AddTask(giftGuide, "Email header set", ss["Done"], priya, 3, -4);
        AddTask(giftGuide, "Social carousel", ss["Briefed in"], priya, 6, 13);
        var keyVisual = AddTask(summer, "Campaign key visual", ss["Working on it"], amahle, 16, 8);
        AddTask(summer, "Billboard adaptation", ss["Briefed in"], ruben, 8, 15);
        AddTask(summer, "Social launch tiles", ss["Feedback needed"], priya, 6, -1, reviewCycle: 2,
            feedback: "Swap the stock rider for one of our own shoot photos, and add the price from R12 999.");
        AddTask(summer, "Scooter spec sheets", ss["Awaiting approval"], priya, 4, 2);
        AddTask(summer, "Rider safety leaflet", ss["Done"], ruben, 4, -9);
        var retailerToolkit = AddTask(backToSchool, "Retailer toolkit", ss["Briefed in"], ethan, 14, 30);
        AddTask(backToSchool, "Campus poster series", ss["Briefed in"], sipho, 8, 35);
        var conceptBoards = AddTask(retailLaunch, "Launch concept boards", ss["Awaiting approval"], sipho, 8, 1, reviewCycle: 2);
        AddTask(retailLaunch, "Retail launch video", ss["Working on it"], amahle, 14, 12);
        AddTask(retailLaunch, "Shelf strips", ss["Briefed in"], ruben, 3, 18);
        AddTask(storeRefresh, "Window graphics", ss["Working on it"], sipho, 10, 10);
        AddTask(storeRefresh, "Store signage pack", ss["Feedback needed"], lerato, 8, -3, reviewCycle: 2,
            feedback: "The aisle signs need to be readable from 5 metres; double the category names.");
        AddTask(popUp, "Pop-up stand graphics", ss["Done"], sipho, 10, -12);
        AddTask(popUp, "Price tags and swing tickets", ss["Done"], priya, 3, -7);
        AddTask(summit, "Summit presentation template", ss["Working on it"], ethan, 8, 5);
        AddTask(summit, "Speaker social tiles", ss["Briefed in"], null, 4, 20);

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

        // Two designers are on leave in the next weeks; Sipho's runs over a weekend. Ruben's sick leave reads
        // "Unavailable" to everyone but him and his approvers (POPIA). Ethan's request waits for the Traffic Manager.
        AddLeave(amahle, 1, 0, 1, 2);
        AddLeave(sipho, 2, 3, 3, 1);
        AddLeave(ruben, 0, 0, 0, 1, TimeOffType.SickLeave);
        AddLeave(ethan, 2, 3, 2, 4, status: TimeOffStatus.Pending, note: "Family wedding in Durban");

        // The organisation's holiday country is South Africa, the only calendar Juggle has so far.
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

        // Briefs, in the studio's template (D50), each sent by the brand's marketing manager.

        var now = clock.Now;

        void AddBriefRequest(Team team, string brand, string jobName, string mainGoal, string deliverables, Priority priority, int dueDays,
            double ageHours, TaskItem? acceptedTask = null, string? rejectionReason = null) =>
            db.Requests.Add(new Request
            {
                OrgId = org.Id,
                TeamId = team.Id,
                RequesterUserId = managerOf[brand].Id,
                DepartmentId = brands[brand].Id,
                Title = jobName,
                MainGoal = mainGoal,
                Deliverables = deliverables,
                RequestedDueDate = Due(dueDays),
                Priority = priority,
                Status = acceptedTask is not null ? RequestStatus.Accepted
                    : rejectionReason is not null ? RequestStatus.Rejected
                    : RequestStatus.New,
                TaskId = acceptedTask?.Id,
                RejectionReason = rejectionReason,
                CreatedAt = now.AddHours(-ageHours),
            });

        AddBriefRequest(studio, "GoPro", "Summer Adventure",
            "Launch the summer adventure push across retail and social, driving accessory bundle sales before the holidays.",
            "Takealot banners\nSocial tiles x6\nIn-store poster A2\nEmail header", Priority.High, 14, 3);
        AddBriefRequest(studio, "Bambu Lab", "Back to School Maker Kits",
            "Position the printers as the tool for school projects in January, with parents and teachers.",
            "A4 insert: Incredible Connection\nSocial carousel\nTakealot banners", Priority.Medium, 21, 20);
        AddBriefRequest(studio, "Pure Electric", "Commuter Range Price Drop",
            "Announce the commuter range price drop in store and online before month end.",
            "Price drop banners\nShelf talkers\nWebsite hero", Priority.Urgent, 7, 28);
        AddBriefRequest(studio, "MS Surface", "Business Roadshow",
            "Support the sales team's roadshow to corporate buyers in Johannesburg and Cape Town.",
            "Presentation template\nPull-up banner\nA5 leave-behind flyer", Priority.Medium, 18, 50);
        AddBriefRequest(studio, "Ultra Human", "Festive Gifting",
            "Make the ring the festive gift for health-conscious shoppers.",
            "Social tiles x8\nInstagram stories x4\nInfluencer brief one-pager", Priority.Medium, 12, 70);
        AddBriefRequest(studio, "DJI", "Black Friday",
            "Win Black Friday at the main retailers with one look across online and in store.",
            "Takealot banners\niStore banners\nBellyband\nCameraland video\nGeneric assets\nA4 inserts for retailers",
            Priority.High, 21, 200, takealotBanners);
        AddBriefRequest(studio, "Bambu Lab", "Holiday Gift Guide",
            "A gift guide that makes the printers the easy festive gift.",
            "Gift guide layout\nPrinter hero renders\nEmail header set\nSocial carousel", Priority.Medium, 24, 220, giftGuideLayout);
        AddBriefRequest(studio, "GoPro", "Festive Bundles",
            "Sell the festive camera bundles on Takealot and in store.",
            "Bundle packshots\nTakealot bundle banners\nSocial cut-downs\nIn-store wobblers", Priority.High, 28, 260, bundlePackshots);
        AddBriefRequest(studio, "DJI", "Amazon Brand Store",
            "Open the DJI brand store on Amazon with a full set of branded pages and product content.",
            "Brand store hero banners\nProduct tiles\nA+ content modules\nStore navigation wireframe", Priority.High, 35, 30 * 24, heroBanners);
        AddBriefRequest(studio, "Pure Electric", "Summer Campaign",
            "Make Pure Electric the summer commute, from billboards to social.",
            "Campaign key visual\nBillboard adaptation\nSocial launch tiles\nScooter spec sheets\nRider safety leaflet",
            Priority.High, 42, 40 * 24, keyVisual);
        AddBriefRequest(studio, "MS Surface", "Back to School",
            "Get Surface on the January back-to-school lists at the main retailers and on campus.",
            "Retailer toolkit\nCampus poster series", Priority.Medium, 70, 25 * 24, retailerToolkit);
        AddBriefRequest(studio, "Ultra Human", "Retail Launch",
            "Launch the ring in its first retail stores with a look that explains it at a glance.",
            "Launch concept boards\nRetail launch video\nShelf strips", Priority.High, 30, 45 * 24, conceptBoards);

        // Briefs from the eight months before this one, delivered, so the briefs report shows nine months of work (D56).
        // Each is a project with its job code, one Done card per deliverable and the request it came from. Job numbers
        // stay below the open briefs', so the next job code is unchanged.
        Person[] designers = [lerato, ethan, sipho, priya, amahle, lerato, ruben, amahle, ethan, priya, sipho, lerato];
        var assigned = 0;
        var thisMonth = new DateOnly(today.Year, today.Month, 1);
        foreach (var past in PastBriefs.OrderBy(b => b.MonthsAgo).ThenByDescending(b => b.Day))
        {
            var sent = thisMonth.AddMonths(-past.MonthsAgo).AddDays(past.Day - 1);
            var ageHours = (now - new DateTimeOffset(sent.ToDateTime(new TimeOnly(9, 0)), TimeSpan.FromHours(2))).TotalHours;
            var dueDays = sent.DayNumber - today.DayNumber + 14;
            TaskItem? first = null;
            if (past.RejectionReason is null)
            {
                var project = AddBrief(studio, past.Brand, past.Number, past.JobName, dueDays);
                foreach (var deliverable in past.Deliverables)
                {
                    var task = AddTask(project, deliverable, ss["Done"], designers[assigned++ % designers.Length], 6, dueDays);
                    first ??= task;
                }
            }

            AddBriefRequest(studio, past.Brand, past.JobName, past.MainGoal, string.Join('\n', past.Deliverables),
                Priority.Medium, dueDays, ageHours, first, past.RejectionReason);
        }

        await db.SaveChangesAsync();
        LogSeeded(logger, weekStart);
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Demo data already present, skipping seed")]
    private static partial void LogAlreadySeeded(ILogger logger);

    [LoggerMessage(Level = LogLevel.Information, Message = "Seeded demo data for the week of {WeekStart}")]
    private static partial void LogSeeded(ILogger logger, DateOnly weekStart);
}
