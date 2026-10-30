using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Data.Seed;

/// <summary>
/// Seeds the demo story: Design and Marketing teams, people, board tasks, six weeks of allocations,
/// leave, public holidays and requests. Dates are relative to the week the seed runs.
/// </summary>
public sealed partial class DemoSeeder(JuggleDbContext db, OrgClock clock, ILogger<DemoSeeder> logger)
{
    private static readonly string[] DepartmentNames = ["Marketing", "Sales", "HR", "Product", "Executive"];

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

        var org = new Organisation { Name = "Stark Industries", TimeZone = OrgClock.TimeZoneId };
        db.Organisations.Add(org);

        // Departments and teams

        var departments = DepartmentNames
            .ToDictionary(name => name, name => new Department { OrgId = org.Id, Name = name });
        db.Departments.AddRange(departments.Values);

        // Colours are hues from the project palette under "Design" in CLAUDE.md.
        var design = new Team { OrgId = org.Id, Name = "Design", Colour = "#8a78d6" };
        var marketing = new Team { OrgId = org.Id, Name = "Marketing", Colour = "#3fa7a0" };
        db.Teams.AddRange(design, marketing);

        // Users and people

        var avatarColours = new Queue<string>(
        [
            "#8a78d6", "#5b8def", "#d16b8f", "#6aa36f", "#d9a441", "#3fa7a0", "#e07a5f",
            "#7b8ea8", "#5b8def", "#d16b8f", "#6aa36f", "#d9a441", "#3fa7a0", "#e07a5f",
        ]);

        User AddUser(string name, string? department = null, OrgRole orgRole = OrgRole.User)
        {
            var user = new User
            {
                OrgId = org.Id,
                Name = name,
                Email = $"{name.ToLowerInvariant().Replace(' ', '.')}@stark.example",
                OrgRole = orgRole,
                AvatarColour = avatarColours.Dequeue(),
                DepartmentId = department is null ? null : departments[department].Id,
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

        var naledi = AddPerson(AddUser("Naledi Khumalo", orgRole: OrgRole.OrgAdmin), "Head of Design", 8, ["Art direction", "Brand"], (design, TeamRole.TeamAdmin));
        var ethan = AddPerson(AddUser("Ethan Pillay"), "Senior UI Designer", 8, ["UI", "Design systems"], (design, TeamRole.Member));
        var lerato = AddPerson(AddUser("Lerato Mokoena"), "UI Designer", 8, ["UI", "Presentations"], (design, TeamRole.Member));
        var jason = AddPerson(AddUser("Jason van Wyk"), "Brand Designer", 8, ["Brand", "Social"], (design, TeamRole.Member), (marketing, TeamRole.Member));
        var amahle = AddPerson(AddUser("Amahle Dlamini"), "Motion Designer", 8, ["Motion", "Video"], (design, TeamRole.Member));
        var ruben = AddPerson(AddUser("Ruben Fourie"), "Graphic Designer", 5, ["Print", "Layout"], (design, TeamRole.Member));
        var priya = AddPerson(AddUser("Priya Naidoo"), "Junior Designer", 8, ["UI", "Illustration"], (design, TeamRole.Member));
        var sipho = AddPerson(AddUser("Sipho Ndlovu"), "Brand Designer", 8, ["Illustration", "Brand"], (design, TeamRole.Member));
        var megan = AddPerson(AddUser("Megan Botha", "Marketing"), "Marketing Lead", 8, ["Strategy", "Copywriting"], (marketing, TeamRole.TeamAdmin));
        var thabo = AddPerson(AddUser("Thabo Mahlangu", "Marketing"), "Content Marketer", 8, ["Copywriting", "Email"], (marketing, TeamRole.Member));
        var chloe = AddPerson(AddUser("Chloe Adams", "Marketing"), "Social Media Manager", 8, ["Social", "Community"], (marketing, TeamRole.Member));

        var david = AddUser("David Cohen", "Sales");
        var fatima = AddUser("Fatima Patel", "HR");
        var kyle = AddUser("Kyle Govender", "Product");

        // Workflow statuses

        Dictionary<string, WorkflowStatus> AddStatuses(Team team, params (string Name, StatusCategory Category)[] statuses)
        {
            var created = statuses
                .Select((s, i) => new WorkflowStatus { OrgId = org.Id, TeamId = team.Id, Name = s.Name, Order = i + 1, Category = s.Category })
                .ToList();
            db.WorkflowStatuses.AddRange(created);
            return created.ToDictionary(s => s.Name);
        }

        var ds = AddStatuses(design,
            ("Triage", StatusCategory.Todo),
            ("To Do", StatusCategory.Todo),
            ("In Design", StatusCategory.InProgress),
            ("Internal Review", StatusCategory.Review),
            ("With Requester", StatusCategory.Review),
            ("Changes Requested", StatusCategory.InProgress),
            ("Done", StatusCategory.Done));

        var ms = AddStatuses(marketing,
            ("Triage", StatusCategory.Todo),
            ("Planned", StatusCategory.Todo),
            ("Writing", StatusCategory.InProgress),
            ("Review", StatusCategory.Review),
            ("Scheduled", StatusCategory.Done),
            ("Published", StatusCategory.Done));

        // Projects

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

        Project AddProject(Team team, string name, string department, string colour, int dueDays)
        {
            var project = new Project { OrgId = org.Id, TeamId = team.Id, DepartmentId = departments[department].Id, Name = name, Colour = colour, DueDate = Due(dueDays) };
            db.Projects.Add(project);
            return project;
        }

        var q1Campaign = AddProject(design, "Q1 Campaign", "Marketing", "#e07a5f", 45);
        var websiteRefresh = AddProject(design, "Website Refresh", "Product", "#5b8def", 40);
        var salesDeck = AddProject(design, "Sales Deck", "Sales", "#6aa36f", 14);
        var hrOnboarding = AddProject(design, "HR Onboarding Pack", "HR", "#d16b8f", 21);
        var annualReport = AddProject(design, "Annual Report", "Executive", "#7b8ea8", 30);
        var launchVideo = AddProject(design, "Product Launch Video", "Product", "#8a78d6", 28);
        var newsletter = AddProject(marketing, "Monthly Newsletter", "Marketing", "#3fa7a0", 25);
        var socialCalendar = AddProject(marketing, "Social Calendar", "Marketing", "#d9a441", 30);
        var caseStudies = AddProject(marketing, "Customer Case Studies", "Sales", "#6aa36f", 35);
        var employerBrand = AddProject(marketing, "Employer Brand", "HR", "#d16b8f", 40);

        // Tasks

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

        var masterTemplate = AddTask(salesDeck, "Sales deck master template", ds["In Design"], lerato, 12, 5);
        AddTask(salesDeck, "Pricing slide redesign", ds["Internal Review"], lerato, 6, 2, reviewCycle: 2);
        AddTask(salesDeck, "Customer logo wall", ds["To Do"], priya, 4, 9);
        var heroConcepts = AddTask(websiteRefresh, "Homepage hero concepts", ds["In Design"], ethan, 16, 7);
        AddTask(websiteRefresh, "Navigation wireframes", ds["With Requester"], ethan, 10, 1, reviewCycle: 2);
        AddTask(websiteRefresh, "Pricing page layout", ds["Changes Requested"], ethan, 8, -2, reviewCycle: 3);
        AddTask(websiteRefresh, "Icon set refresh", ds["To Do"], sipho, 12, 14);
        AddTask(websiteRefresh, "Footer and legal pages", ds["Done"], priya, 4, -5);
        AddTask(websiteRefresh, "Design system colour tokens", ds["Done"], ethan, 6, -8);
        var welcomeBooklet = AddTask(hrOnboarding, "Welcome booklet layout", ds["In Design"], ruben, 10, 6);
        AddTask(hrOnboarding, "Office map illustration", ds["Internal Review"], sipho, 6, 3);
        AddTask(hrOnboarding, "Benefits one-pager", ds["To Do"], ruben, 4, 12);
        AddTask(hrOnboarding, "Onboarding slide template", ds["Done"], ruben, 5, -10);
        AddTask(annualReport, "Annual report cover options", ds["With Requester"], naledi, 8, 4, reviewCycle: 2);
        AddTask(annualReport, "Financial charts style guide", ds["In Design"], naledi, 10, 10);
        AddTask(annualReport, "CEO letter spread", ds["To Do"], sipho, 6, 18);
        AddTask(annualReport, "Annual report infographics", ds["Changes Requested"], sipho, 12, -1, reviewCycle: 2);
        AddTask(launchVideo, "Launch video storyboard", ds["Internal Review"], amahle, 12, 3);
        AddTask(launchVideo, "Animated logo sting", ds["In Design"], amahle, 8, 8);
        AddTask(launchVideo, "Feature explainer animations", ds["To Do"], amahle, 20, 20);
        AddTask(launchVideo, "Social cutdowns", ds["To Do"], null, 8, 25);
        AddTask(q1Campaign, "Campaign key visual", ds["In Design"], jason, 16, 5);
        AddTask(q1Campaign, "Billboard adaptation", ds["To Do"], jason, 8, 11);
        AddTask(q1Campaign, "Email header set", ds["Done"], priya, 3, -3);
        AddTask(q1Campaign, "Campaign brand guidelines", ds["With Requester"], jason, 6, -1);
        AddTask(q1Campaign, "Print ad for trade magazine", ds["Done"], sipho, 6, -12);
        AddTask(q1Campaign, "Event banner", ds["Internal Review"], ruben, 5, 2);
        AddTask(q1Campaign, "Trade show stand graphics", ds["To Do"], lerato, 14, 16);

        AddTask(newsletter, "November newsletter copy", ms["Writing"], thabo, 6, 6);
        AddTask(newsletter, "Newsletter subscriber survey", ms["Planned"], thabo, 4, 15);
        AddTask(newsletter, "October newsletter", ms["Published"], thabo, 6, -6);
        AddTask(socialCalendar, "November social calendar", ms["Review"], chloe, 5, 3, reviewCycle: 2);
        AddTask(socialCalendar, "Instagram reels plan", ms["Writing"], chloe, 6, 8);
        AddTask(socialCalendar, "LinkedIn carousel graphics", ms["Planned"], jason, 6, 10);
        AddTask(socialCalendar, "Weekly social posts", ms["Scheduled"], chloe, 4, 1);
        AddTask(caseStudies, "Case study: Karoo Freight", ms["Writing"], megan, 10, 12);
        AddTask(caseStudies, "Case study: Blue Crane Bank", ms["Planned"], thabo, 10, 20);
        AddTask(employerBrand, "Careers page copy", ms["Review"], megan, 4, 4);
        AddTask(employerBrand, "Employer brand video script", ms["Planned"], chloe, 6, 18);
        AddTask(employerBrand, "Graduate programme flyer", ms["Published"], jason, 3, -9);

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

        Allocate(naledi, annualReport, -1, 0, 1, 4, 3);
        Allocate(naledi, websiteRefresh, 0, 0, 0, 4, 2);
        Allocate(naledi, q1Campaign, 2, 0, 3, 4, 2);
        Allocate(naledi, annualReport, 3, 0, 4, 2, 2);

        Allocate(ethan, websiteRefresh, -1, 0, 1, 4, 5);
        Allocate(ethan, launchVideo, 0, 0, 0, 2, 2);
        Allocate(ethan, salesDeck, 1, 1, 2, 2, 3);
        Allocate(ethan, websiteRefresh, 2, 3, 4, 4, 4);
        Allocate(ethan, annualReport, 5, 0, 5, 3, 2);

        // Lerato is over capacity from Tuesday next week.
        Allocate(lerato, salesDeck, -1, 2, 1, 4, 5);
        Allocate(lerato, q1Campaign, 0, 0, 0, 1, 1);
        Allocate(lerato, q1Campaign, 1, 1, 2, 1, 5);
        Allocate(lerato, hrOnboarding, 2, 2, 3, 4, 3);
        Allocate(lerato, websiteRefresh, 4, 0, 5, 2, 4);

        // Jason's load is split across Design and Marketing.
        Allocate(jason, q1Campaign, 0, 0, 2, 1, 4);
        Allocate(jason, socialCalendar, 0, 2, 2, 4, 2.5m);
        Allocate(jason, employerBrand, 3, 0, 3, 4, 3);
        Allocate(jason, annualReport, 4, 1, 5, 4, 4);

        Allocate(amahle, launchVideo, 0, 0, 2, 4, 6);
        Allocate(amahle, salesDeck, 0, 3, 0, 4, 2);
        Allocate(amahle, launchVideo, 3, 0, 4, 2, 4);

        Allocate(ruben, hrOnboarding, -1, 0, 1, 4, 2.5m);
        Allocate(ruben, q1Campaign, 0, 0, 1, 2, 2);
        Allocate(ruben, hrOnboarding, 2, 0, 3, 1, 3);
        Allocate(ruben, annualReport, 4, 0, 5, 4, 2);

        // Priya is the under-loaded designer the demo assigns new work to. Next week she is at 50% (green), so the
        // demo's 16h booking (4h/day, Monday to Thursday) takes her to 90% (amber) while her 4 weeks stay under 50%.
        Allocate(priya, websiteRefresh, 0, 0, 1, 4, 2);
        Allocate(priya, salesDeck, 0, 1, 0, 2, 2);
        Allocate(priya, annualReport, 1, 0, 1, 4, 2);
        Allocate(priya, hrOnboarding, 2, 0, 2, 4, 2);
        Allocate(priya, websiteRefresh, 3, 2, 4, 1, 3);

        // Sipho is over capacity on Thursday and Friday this week (10h of 8h), so the dashboard shows one person over.
        Allocate(sipho, annualReport, -1, 0, 1, 4, 3);
        Allocate(sipho, hrOnboarding, 0, 0, 2, 2, 2);
        Allocate(sipho, websiteRefresh, 0, 3, 1, 1, 2);
        Allocate(sipho, q1Campaign, 0, 3, 0, 4, 3);
        Allocate(sipho, annualReport, 3, 2, 5, 1, 4);

        Allocate(megan, caseStudies, -1, 0, 1, 4, 3);
        Allocate(megan, employerBrand, 0, 0, 2, 4, 2);
        Allocate(megan, newsletter, 2, 0, 2, 3, 2);
        Allocate(megan, caseStudies, 3, 0, 5, 4, 3);

        Allocate(thabo, newsletter, 0, 0, 1, 2, 4);
        Allocate(thabo, caseStudies, 0, 1, 2, 4, 2.5m);
        Allocate(thabo, newsletter, 3, 0, 4, 4, 4);

        Allocate(chloe, socialCalendar, -1, 0, 1, 4, 4);
        Allocate(chloe, employerBrand, 0, 2, 1, 1, 2);
        Allocate(chloe, socialCalendar, 2, 0, 4, 4, 4);
        Allocate(chloe, employerBrand, 5, 0, 5, 4, 3);

        // Leave and public holidays

        void AddLeave(Person person, int fromWeek, int fromDay, int toWeek, int toDay) =>
            db.TimeOff.Add(new TimeOff
            {
                OrgId = org.Id,
                PersonId = person.Id,
                StartDate = weekStart.AddDays((fromWeek * 7) + fromDay),
                EndDate = weekStart.AddDays((toWeek * 7) + toDay),
                Type = TimeOffType.AnnualLeave,
                Status = TimeOffStatus.Approved,
                Description = "Annual leave",
            });

        // Two Design people are on leave in the next weeks; Sipho's runs over a weekend.
        AddLeave(amahle, 1, 0, 1, 2);
        AddLeave(sipho, 2, 3, 3, 1);
        AddLeave(thabo, 1, 3, 1, 4);

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

        // Requests

        var now = clock.Now;

        void AddRequest(Team team, User requester, RequestType type, string title, string description, Priority priority, int dueDays, double ageHours, TaskItem? acceptedTask = null) =>
            db.Requests.Add(new Request
            {
                OrgId = org.Id,
                TeamId = team.Id,
                RequesterUserId = requester.Id,
                DepartmentId = requester.DepartmentId!.Value,
                Type = type,
                Title = title,
                Description = description,
                RequestedDueDate = Due(dueDays),
                Priority = priority,
                Status = acceptedTask is null ? RequestStatus.New : RequestStatus.Accepted,
                TaskId = acceptedTask?.Id,
                CreatedAt = now.AddHours(-ageHours),
            });

        AddRequest(design, david, RequestType.Print, "Retail partner brochure", "A 4-page brochure for retail partners covering the new product range.", Priority.High, 14, 3);
        AddRequest(design, fatima, RequestType.Print, "Wellness week posters", "Three A3 posters for wellness week in the Johannesburg and Cape Town offices.", Priority.Medium, 10, 20);
        AddRequest(design, kyle, RequestType.Web, "App store screenshots", "Updated screenshots for the iOS and Android listings after the redesign.", Priority.High, 12, 28);
        AddRequest(design, fatima, RequestType.Print, "Recruitment fair banner", "A pull-up banner for the university recruitment fair.", Priority.Low, 21, 50);
        AddRequest(design, kyle, RequestType.Social, "Webinar promo graphics", "Social tiles and an email header for the product webinar.", Priority.Medium, 9, 70);
        AddRequest(marketing, kyle, RequestType.Copy, "Product update blog post", "A blog post announcing the November product update.", Priority.Medium, 10, 6);
        AddRequest(marketing, david, RequestType.Copy, "Sales enablement email sequence", "A five-email nurture sequence for new leads.", Priority.High, 14, 30);
        AddRequest(design, david, RequestType.Presentation, "Sales deck master template", "A new master template for all sales presentations.", Priority.High, 5, 200, masterTemplate);
        AddRequest(design, fatima, RequestType.Print, "Welcome booklet for new starters", "A printed welcome booklet for the onboarding pack.", Priority.Medium, 6, 220, welcomeBooklet);
        AddRequest(design, kyle, RequestType.Web, "Homepage hero refresh", "New hero concepts for the website homepage.", Priority.High, 7, 260, heroConcepts);

        await db.SaveChangesAsync();
        LogSeeded(logger, weekStart);
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Demo data already present, skipping seed")]
    private static partial void LogAlreadySeeded(ILogger logger);

    [LoggerMessage(Level = LogLevel.Information, Message = "Seeded demo data for the week of {WeekStart}")]
    private static partial void LogSeeded(ILogger logger, DateOnly weekStart);
}
