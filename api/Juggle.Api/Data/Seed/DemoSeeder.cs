using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Jobs;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Data.Seed;

/// <summary>
/// Seeds The Core Group, the first organisation's configuration and demo story (D73, D77): its roles and their
/// capabilities, terms, board columns, statuses and workflow, the design studio serving the group's brands, jobs in
/// every stage with their job IDs, the closed jobs of the eight months before, six weeks of bookings, leave and public
/// holidays. Dates are relative to the week the seed runs. People are fictional.
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

    // The 8 palette hues under "Design" in CLAUDE.md, for status chips.
    private const string Blue = "#5b8def", Teal = "#3fa7a0", Sage = "#6aa36f", Amber = "#d9a441";
    private const string Coral = "#e07a5f", Rose = "#d16b8f", Violet = "#8a78d6", Slate = "#7b8ea8";

    /// <summary>
    /// A brief from an earlier month: sent on day Day of the month MonthsAgo months back, and closed about two weeks
    /// later, or cancelled by the Traffic Manager with a reason (D75).
    /// </summary>
    private sealed record PastBrief(
        string Brand, int Number, string JobName, int MonthsAgo, int Day, string MainGoal, string[] Deliverables,
        string? CancelReason = null);

    /// <summary>Jobs closed in the eight months before this one, by the brands with the most work (D56).</summary>
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
        new("Bambu Lab", 47, "Trade Show Booth", 5, 21, "Our stand at the Maker Faire.", ["Booth graphics", "Banner stands"],
            CancelReason: "The events agency is designing the booth this year."),
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
        new("Ultra Human", 16, "Partner Webinar Slides", 2, 20, "Slides for the partner webinar.", ["Webinar slide deck"],
            CancelReason: "Marketing is building these from the existing template."),
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
        var now = clock.Now;

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

        // Board columns and statuses: The Core Group's five columns (D64) and the 16 statuses of its requirements plus
        // Cancelled (D69, D75), Scheduled in In Design (D76). Each status has a palette hue for its chip.

        var columnOrder = 0;
        BoardColumn AddColumn(string name)
        {
            var column = new BoardColumn { OrgId = org.Id, Name = name, Order = columnOrder++ };
            db.BoardColumns.Add(column);
            return column;
        }

        var statuses = new List<JobStatus>();
        JobStatus AddStatus(BoardColumn column, string name, string colour, JobStatusKind kind = JobStatusKind.Open)
        {
            var status = new JobStatus { OrgId = org.Id, ColumnId = column.Id, Name = name, Order = statuses.Count, Colour = colour, Kind = kind };
            statuses.Add(status);
            db.JobStatuses.Add(status);
            return status;
        }

        var incoming = AddColumn("Incoming");
        var inDesign = AddColumn("In Design");
        var inReview = AddColumn("In Review");
        var withMarketing = AddColumn("With Marketing");
        var doneColumn = AddColumn("Done");

        var newRequest = AddStatus(incoming, "New Request", Blue);
        var awaitingTrafficReview = AddStatus(incoming, "Awaiting Traffic Review", Blue);
        var awaitingInformation = AddStatus(incoming, "Awaiting Information", Amber);
        var awaitingAllocation = AddStatus(incoming, "Awaiting Allocation", Slate);
        var awaitingRevisionScheduling = AddStatus(incoming, "Awaiting Revision Scheduling", Coral);
        var scheduled = AddStatus(inDesign, "Scheduled", Slate);
        var inProgress = AddStatus(inDesign, "In Progress", Blue);
        var designChangesRequired = AddStatus(inDesign, "Design Changes Required", Coral);
        var revisionScheduled = AddStatus(inDesign, "Revision Scheduled", Slate);
        var revisionInProgress = AddStatus(inDesign, "Revision In Progress", Violet);
        var awaitingDesignApproval = AddStatus(inReview, "Awaiting Design Approval", Amber);
        var awaitingMarketingApproval = AddStatus(withMarketing, "Awaiting Marketing Approval", Amber);
        var awaitingBusinessApproval = AddStatus(withMarketing, "Awaiting Business Approval", Rose);
        // No step leads here: changes requested are recorded on the approval and go to revision scheduling (open question 3).
        AddStatus(withMarketing, "Marketing Changes Required", Coral);
        var readyToClose = AddStatus(withMarketing, "Approved / Ready to Close", Sage);
        var closed = AddStatus(doneColumn, "Closed / Completed", Teal, JobStatusKind.Done);
        var cancelled = AddStatus(doneColumn, "Cancelled", Slate, JobStatusKind.Cancelled);

        // The workflow: which statuses each action moves a job between, and the approval it records (D77).

        void Step(WorkflowAction action, JobStatus[] from, JobStatus to, ApprovalStage? stage = null)
        {
            foreach (var status in from)
            {
                db.WorkflowTransitions.Add(new WorkflowTransition
                {
                    OrgId = org.Id, Action = action, FromStatusId = status.Id, ToStatusId = to.Id, Stage = stage,
                });
            }
        }

        db.WorkflowTransitions.Add(new WorkflowTransition { OrgId = org.Id, Action = WorkflowAction.Submit, ToStatusId = newRequest.Id });
        Step(WorkflowAction.RequestInformation, [newRequest, awaitingTrafficReview, awaitingAllocation], awaitingInformation);
        Step(WorkflowAction.Answer, [awaitingInformation], awaitingTrafficReview);
        Step(WorkflowAction.MarkReady, [newRequest, awaitingTrafficReview], awaitingAllocation);
        Step(WorkflowAction.AllocateAndSchedule, [newRequest, awaitingTrafficReview, awaitingAllocation], scheduled);
        Step(WorkflowAction.AllocateAndSchedule, [awaitingRevisionScheduling], revisionScheduled);
        Step(WorkflowAction.Start, [scheduled], inProgress);
        Step(WorkflowAction.Start, [revisionScheduled], revisionInProgress);
        Step(WorkflowAction.SubmitForApproval, [inProgress, revisionInProgress, designChangesRequired], awaitingDesignApproval);
        Step(WorkflowAction.ApproveDesign, [awaitingDesignApproval], awaitingMarketingApproval, ApprovalStage.Design);
        Step(WorkflowAction.SendBack, [awaitingDesignApproval], designChangesRequired, ApprovalStage.Design);
        Step(WorkflowAction.ApproveMarketing, [awaitingMarketingApproval], readyToClose, ApprovalStage.Marketing);
        Step(WorkflowAction.NeedsBusinessApproval, [awaitingMarketingApproval], awaitingBusinessApproval);
        Step(WorkflowAction.RecordBusinessApproval, [awaitingBusinessApproval], readyToClose, ApprovalStage.Business);
        Step(WorkflowAction.RequestChanges, [awaitingMarketingApproval, readyToClose], awaitingRevisionScheduling, ApprovalStage.Marketing);
        Step(WorkflowAction.RequestChanges, [awaitingBusinessApproval], awaitingRevisionScheduling, ApprovalStage.Business);
        Step(WorkflowAction.Close, [readyToClose], closed);
        Step(WorkflowAction.Cancel, [.. statuses.Where(s => s.Kind == JobStatusKind.Open)], cancelled);

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
        var managerOf = new Dictionary<string, User>();
        void AddManager(string name, params string[] managed)
        {
            var user = AddUser(name, marketingManager);
            foreach (var brand in managed)
            {
                db.DepartmentManagers.Add(new DepartmentManager { OrgId = org.Id, UserId = user.Id, DepartmentId = brands[brand].Id });
                managerOf[brand] = user;
            }
        }

        AddUser("Megan Botha", headOfMarketing);
        AddUser("Naledi Khumalo", headOfDesign);
        var chloe = AddUser("Chloe Adams", trafficManager);

        var ethan = AddDesigner("Ethan Pillay", "Senior Designer", ["Digital", "E-commerce"]);
        var lerato = AddDesigner("Lerato Mokoena", "Senior Designer", ["Retail", "Campaigns", "Print"]);
        var amahle = AddDesigner("Amahle Dlamini", "Motion Designer", ["Motion", "Video"]);
        var ruben = AddDesigner("Ruben Fourie", "Artworker", ["Print", "Artwork"], hoursPerDay: 5);
        var priya = AddDesigner("Priya Naidoo", "Junior Designer", ["Digital", "Social"]);
        var sipho = AddDesigner("Sipho Ndlovu", "Digital Designer", ["E-commerce", "Banners"]);

        AddManager("Zanele Mthembu", "DJI", "Pure Electric");
        AddManager("Pieter Smit", "GoPro");
        AddManager("Ayesha Moosa", "Bambu Lab");
        AddManager("Nicole Jacobs", "MS Surface");
        AddManager("Bongani Zulu", "Ultra Human");
        AddManager("Thabo Mahlangu", "CORE", "CGA");
        AddManager("Lindiwe Khoza", "InRetail", "Reloved");
        AddManager("Werner Steyn", "ARP", "CVM");
        AddManager("Fatima Patel", "Mobile in Africa", "CCB");

        // Jobs: each brief sent by the brand's marketing manager, with its job ID from the brand's number and the
        // quarter of its required date (D63). Every job starts with its Submit event.

        // A date `days` from today, moved off weekends (back for past dates, forward for future ones).
        DateOnly Due(int days)
        {
            var date = today.AddDays(days);
            while (date.IsWeekend())
            {
                date = date.AddDays(days < 0 ? -1 : 1);
            }

            return date;
        }

        void AddEvent(Job job, User user, DateTimeOffset at, WorkflowAction action, JobStatus? from, JobStatus to, string? message = null) =>
            db.JobEvents.Add(new JobEvent
            {
                OrgId = org.Id, JobId = job.Id, UserId = user.Id, At = at, Action = action,
                FromStatusId = from?.Id, ToStatusId = to.Id, Message = message,
            });

        Job AddJob(string brand, int number, string title, JobStatus status, int dueDays, double ageHours, string mainGoal,
            string deliverables, Person? designerPerson = null, decimal? estimate = null, Priority priority = Priority.Medium)
        {
            var required = Due(dueDays);
            var job = new Job
            {
                OrgId = org.Id,
                TeamId = studio.Id,
                DepartmentId = brands[brand].Id,
                RequesterUserId = managerOf[brand].Id,
                Code = JobCodes.Name(brands[brand].JobCodePrefix!, number, required, FinancialYearStartMonth, title),
                Title = title,
                MainGoal = mainGoal,
                Deliverables = deliverables,
                RequiredDate = required,
                Priority = priority,
                CreatedAt = now.AddHours(-ageHours),
                StatusId = status.Id,
                DesignerPersonId = designerPerson?.Id,
                EstimateHours = estimate,
            };
            db.Jobs.Add(job);
            AddEvent(job, managerOf[brand], job.CreatedAt, WorkflowAction.Submit, null, newRequest);
            return job;
        }

        const double Day = 24;

        // About 30 open jobs in every stage. Lerato has the most open work; four jobs are overdue; five wait in the
        // Traffic Manager's incoming queue (two new, one reviewed after an answer, one ready to allocate, one revision).
        AddJob("DJI", 135, "Black Friday Bellyband", awaitingRevisionScheduling, -1, 12 * Day,
            "A bellyband for the Black Friday camera boxes.", "Bellyband", lerato, 4, Priority.High);
        AddJob("DJI", 136, "Black Friday iStore Banners", awaitingDesignApproval, 4, 10 * Day,
            "iStore's Black Friday banners in the shared look.", "iStore web banners\niStore email header", lerato, 6, Priority.High);
        var aPlusContent = AddJob("DJI", 137, "Brand Store A+ Content", inProgress, 16, 30 * Day,
            "A+ content for the brand store's top products.", "A+ content modules", sipho, 12);
        var cameralandVideo = AddJob("DJI", 138, "Black Friday Cameraland Video", inProgress, 8, 9 * Day,
            "A short video for Cameraland's Black Friday screens.", "Cameraland video 15s\nCameraland video 6s", amahle, 16, Priority.High);
        var retailerInserts = AddJob("DJI", 139, "Black Friday Retailer Inserts", awaitingDesignApproval, 1, 9 * Day,
            "A4 inserts for the retailers' Black Friday catalogues.",
            "A4 insert: Incredible Connection\nA4 insert: Cameraland\nA4 insert: Kloppers\nA4 insert: ODP", ruben, 12, Priority.High);
        var productTiles = AddJob("DJI", 140, "Brand Store Product Tiles", scheduled, 14, 30 * Day,
            "Product tiles for every camera and drone in the brand store.", "Product tiles", lerato, 10);
        var blackFriday = AddJob("DJI", 141, "Black Friday", inProgress, 21, 200,
            "Win Black Friday at the main retailers with one look across online and in store.",
            "Takealot banners\nGeneric assets", lerato, 24, Priority.High);
        var brandStore = AddJob("DJI", 142, "Amazon Brand Store", inProgress, 9, 30 * Day,
            "Open the DJI brand store on Amazon with a full set of branded pages.",
            "Brand store hero banners\nStore navigation wireframe", ethan, 18, Priority.High);

        var socialCutDowns = AddJob("GoPro", 211, "Festive Social Cut-downs", inProgress, 10, 260,
            "Social cut-downs of the festive bundle video.", "Social cut-downs 9:16\nSocial cut-downs 1:1", amahle, 10);
        var wobblers = AddJob("GoPro", 212, "Festive In-store Wobblers", revisionInProgress, 12, 260,
            "Shelf wobblers for the festive bundles.", "In-store wobblers", ruben, 4);
        var festiveBundles = AddJob("GoPro", 213, "Festive Bundles", inProgress, 3, 260,
            "Sell the festive camera bundles on Takealot and in store.", "Bundle packshots\nTakealot bundle banners", sipho, 14, Priority.High);
        AddJob("GoPro", 214, "Summer Adventure", newRequest, 14, 3,
            "Launch the summer adventure push across retail and social, driving accessory bundle sales before the holidays.",
            "Takealot banners\nSocial tiles x6\nIn-store poster A2\nEmail header", priority: Priority.High);

        var webBanners = AddJob("Bambu Lab", 53, "Gift Guide Web Banners", revisionScheduled, 16, 220,
            "Web banners that point to the gift guide.", "Gift guide web banners", priya, 10);
        AddJob("Bambu Lab", 54, "Gift Guide Email Header", readyToClose, 2, 220,
            "The email header set for the gift guide send.", "Email header set", priya, 3);
        var carousel = AddJob("Bambu Lab", 55, "Gift Guide Social Carousel", inProgress, 13, 220,
            "A social carousel of the gift guide's picks.", "Social carousel", priya, 6);
        var renders = AddJob("Bambu Lab", 56, "Gift Guide Printer Renders", designChangesRequired, -2, 220,
            "Warm, giftable renders of the printers.", "Printer hero renders", ethan, 8);
        var giftGuide = AddJob("Bambu Lab", 57, "Holiday Gift Guide", inProgress, 6, 220,
            "A gift guide that makes the printers the easy festive gift.", "Gift guide layout", lerato, 12);
        AddJob("Bambu Lab", 58, "Back to School Maker Kits", newRequest, 21, 20,
            "Position the printers as the tool for school projects in January, with parents and teachers.",
            "A4 insert: Incredible Connection\nSocial carousel\nTakealot banners");

        AddJob("Pure Electric", 32, "Scooter Spec Sheets", awaitingBusinessApproval, -1, 40 * Day,
            "Spec sheets for the sales team, checked by Sales before print.", "Scooter spec sheets", priya, 4);
        var billboard = AddJob("Pure Electric", 33, "Summer Billboard", scheduled, 42, 40 * Day,
            "The summer key visual adapted for billboards.", "Billboard adaptation", ruben, 8);
        var summer = AddJob("Pure Electric", 34, "Summer Campaign", inProgress, 15, 40 * Day,
            "Make Pure Electric the summer commute, from billboards to social.",
            "Campaign key visual\nSocial launch tiles", priya, 12, Priority.High);
        AddJob("Pure Electric", 35, "Commuter Range Price Drop", awaitingInformation, 7, 28,
            "Announce the commuter range price drop in store and online before month end.",
            "Price drop banners\nShelf talkers\nWebsite hero", priority: Priority.Urgent);

        var btsSocial = AddJob("MS Surface", 96, "Back to School Social", scheduled, 35, 25 * Day,
            "Back-to-school social for students and parents.", "Social tiles x6\nInstagram stories x3", priya, 12);
        var campusPosters = AddJob("MS Surface", 97, "Campus Poster Series", scheduled, 40, 25 * Day,
            "Posters for the university campuses.", "Campus poster series", sipho, 24);
        var backToSchool = AddJob("MS Surface", 98, "Back to School", scheduled, 45, 25 * Day,
            "Get Surface on the January back-to-school lists at the main retailers.", "Retailer toolkit", ethan, 14);
        AddJob("MS Surface", 99, "Business Roadshow", awaitingTrafficReview, 18, 50,
            "Support the sales team's roadshow to corporate buyers in Johannesburg and Cape Town.",
            "Presentation template\nPull-up banner\nA5 leave-behind flyer");

        AddJob("Ultra Human", 20, "Launch Concept Boards", awaitingMarketingApproval, 1, 45 * Day,
            "Concept boards for the first retail stores.", "Launch concept boards", sipho, 8, Priority.High);
        var shelfStrips = AddJob("Ultra Human", 21, "Retail Launch Shelf Strips", scheduled, 18, 45 * Day,
            "Shelf strips that explain the ring at a glance.", "Shelf strips", ruben, 6);
        var retailLaunch = AddJob("Ultra Human", 22, "Retail Launch", scheduled, 30, 45 * Day,
            "Launch the ring in its first retail stores with a look that explains it at a glance.", "Retail launch video", amahle, 14, Priority.High);
        AddJob("Ultra Human", 23, "Festive Gifting", awaitingAllocation, 12, 70,
            "Make the ring the festive gift for health-conscious shoppers.",
            "Social tiles x8\nInstagram stories x4\nInfluencer brief one-pager");

        AddJob("InRetail", 101, "Store Signage Pack", designChangesRequired, -3, 20 * Day,
            "Aisle signage for the refreshed stores, readable from 5 metres.", "Store signage pack", lerato, 8);
        var storeRefresh = AddJob("InRetail", 102, "Store Refresh", inProgress, 10, 20 * Day,
            "A fresh look for the stores, starting with the windows.", "Window graphics\nTill point posters", lerato, 16);

        var summit = AddJob("Mobile in Africa", 29, "Summit Presentation", inProgress, 5, 14 * Day,
            "The keynote template for the Mobile in Africa summit.", "Summit presentation template", ethan, 8);

        var popUp = AddJob("Reloved", 15, "Festive Pop-up", closed, -5, 30 * Day,
            "Graphics for the festive pop-up store.", "Pop-up stand graphics\nPrice tags and swing tickets", sipho, 13);
        popUp.ClosedAt = now.AddDays(-3);
        popUp.ClosedByUserId = managerOf["Reloved"].Id;
        AddEvent(popUp, managerOf["Reloved"], popUp.ClosedAt.Value, WorkflowAction.Close, readyToClose, closed);

        // Jobs from the eight months before this one, so the briefs report shows nine months of work (D56). Each was
        // closed by its marketing manager about two weeks after it was sent, or cancelled by the Traffic Manager the next
        // day. Their numbers are below the open jobs', so DJI's next job is 0143.
        Person[] designers = [lerato, ethan, sipho, priya, amahle, lerato, ruben, amahle, ethan, priya, sipho, lerato];
        var assigned = 0;
        var thisMonth = new DateOnly(today.Year, today.Month, 1);
        foreach (var past in PastBriefs.OrderBy(b => b.MonthsAgo).ThenByDescending(b => b.Day))
        {
            var sent = thisMonth.AddMonths(-past.MonthsAgo).AddDays(past.Day - 1);
            // 9:00 in Johannesburg, stored in UTC as Postgres needs.
            var sentAt = new DateTimeOffset(sent.ToDateTime(new TimeOnly(9, 0)), TimeSpan.FromHours(2)).ToUniversalTime();
            var dueDays = sent.DayNumber - today.DayNumber + 14;
            var requester = managerOf[past.Brand];
            if (past.CancelReason is { } reason)
            {
                var rejected = AddJob(past.Brand, past.Number, past.JobName, cancelled, dueDays, (now - sentAt).TotalHours,
                    past.MainGoal, string.Join('\n', past.Deliverables));
                AddEvent(rejected, chloe, sentAt.AddDays(1), WorkflowAction.Cancel, newRequest, cancelled, reason);
                continue;
            }

            var job = AddJob(past.Brand, past.Number, past.JobName, closed, dueDays, (now - sentAt).TotalHours,
                past.MainGoal, string.Join('\n', past.Deliverables), designers[assigned++ % designers.Length], 6 * past.Deliverables.Length);
            job.PlannedStartDate = sent.AddDays(2);
            job.ExpectedCompletionDate = Due(dueDays - 1);
            job.ClosedAt = sentAt.AddDays(14).AddHours(6);
            job.ClosedByUserId = requester.Id;
            AddEvent(job, requester, job.ClosedAt.Value, WorkflowAction.Close, readyToClose, closed);
        }

        // Allocations: weeks -1 to 5 relative to this week; weekdays 0 (Mon) to 4 (Fri).
        // Lengths vary from two days to three weeks, with gaps, and the far weeks are lighter. A booked job's planned
        // start and expected completion are its first and last booked days.

        void Allocate(Person person, Job job, int fromWeek, int fromDay, int toWeek, int toDay, decimal hoursPerDay)
        {
            var start = weekStart.AddDays((fromWeek * 7) + fromDay);
            var end = weekStart.AddDays((toWeek * 7) + toDay);
            db.Allocations.Add(new Allocation
            {
                OrgId = org.Id,
                PersonId = person.Id,
                JobId = job.Id,
                StartDate = start,
                EndDate = end,
                HoursPerDay = hoursPerDay,
            });
            job.PlannedStartDate = job.PlannedStartDate is { } planned && planned < start ? planned : start;
            job.ExpectedCompletionDate = job.ExpectedCompletionDate is { } expected && expected > end ? expected : end;
        }

        // Ethan is booked exactly 8h Tuesday to Friday next week, a full day for the demo's clash.
        Allocate(ethan, brandStore, -1, 0, 1, 4, 5);
        Allocate(ethan, summit, 0, 0, 0, 2, 2);
        Allocate(ethan, renders, 1, 1, 2, 2, 3);
        Allocate(ethan, brandStore, 2, 3, 4, 4, 4);
        Allocate(ethan, backToSchool, 5, 0, 5, 3, 2);

        // Lerato is the overloaded designer: 11h on Tuesday to Friday this week and Monday to Wednesday next week,
        // so she is the only one over capacity this week.
        Allocate(lerato, blackFriday, -1, 0, 1, 4, 5);
        Allocate(lerato, giftGuide, 0, 0, 1, 2, 3);
        Allocate(lerato, storeRefresh, 0, 1, 0, 4, 3);
        Allocate(lerato, productTiles, 1, 0, 2, 2, 3);
        Allocate(lerato, giftGuide, 2, 0, 3, 4, 3);
        Allocate(lerato, storeRefresh, 3, 0, 4, 4, 5);

        Allocate(amahle, cameralandVideo, 0, 0, 2, 4, 6);
        Allocate(amahle, socialCutDowns, 0, 3, 0, 4, 2);
        Allocate(amahle, retailLaunch, 3, 0, 4, 2, 4);

        Allocate(ruben, retailerInserts, -1, 0, 1, 4, 2.5m);
        Allocate(ruben, wobblers, 0, 0, 1, 2, 2);
        Allocate(ruben, shelfStrips, 2, 0, 3, 1, 3);
        Allocate(ruben, billboard, 4, 0, 5, 4, 2);

        // Priya is the under-loaded designer the demo assigns new work to. Next week she is at 50% (green), so the
        // demo's 16h booking (4h/day, Monday to Thursday) takes her to 90% (amber) while her 4 weeks stay under 50%.
        Allocate(priya, carousel, 0, 0, 1, 4, 2);
        Allocate(priya, summer, 0, 1, 0, 2, 2);
        Allocate(priya, summer, 1, 0, 1, 4, 2);
        Allocate(priya, webBanners, 2, 0, 2, 4, 2);
        Allocate(priya, btsSocial, 3, 2, 4, 1, 3);

        Allocate(sipho, festiveBundles, -1, 0, 1, 4, 3);
        Allocate(sipho, aPlusContent, 0, 0, 2, 2, 2);
        Allocate(sipho, festiveBundles, 0, 3, 1, 1, 2);
        Allocate(sipho, campusPosters, 3, 2, 5, 1, 4);

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

        await db.SaveChangesAsync();
        LogSeeded(logger, weekStart);
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Demo data already present, skipping seed")]
    private static partial void LogAlreadySeeded(ILogger logger);

    [LoggerMessage(Level = LogLevel.Information, Message = "Seeded demo data for the week of {WeekStart}")]
    private static partial void LogSeeded(ILogger logger, DateOnly weekStart);
}
