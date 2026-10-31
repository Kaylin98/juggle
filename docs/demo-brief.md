# Demo Build Brief: Juggle

Oct 26, 2026 · @Kaylin

A working, clickable demo of the platform by Oct 30, 2026, built in the planned stack so it becomes the MVP foundation. Feed this tab to Claude Code and ask it to produce `plan.md`.

## Goal and demo story

The demo must prove one thing: a team lead can see who is busy, who is free and what is waiting, in one place, for any department.

- **Story:** a request comes in, the Head of Design triages it, plans it on the board, books a designer on the schedule, and sees utilisation update on the dashboard
- **Hero feature:** the schedule (a capacity grid). This is the "Resource Guru" half that a Kanban board alone can't show
- **Department-agnostic proof:** two seeded teams (Design and Marketing) with a team switcher, each with its own workflow columns
- **Quality bar:** looks like a real product, runs reliably on a laptop, realistic data. Not production-ready

## Scope

Six features are in; everything else waits until after the demo.

**In the demo (priority order)**

1. **Schedule:** a capacity grid of people x days, allocations in hours/day, load colours, drag to create/move/resize, clash warning, time off shown
2. **Kanban board:** per-team workflow columns, drag-drop between columns, task drawer to edit
3. **Request intake + triage:** a request form, a triage inbox, accept turns a request into a task
4. **Team dashboard:** utilisation per person (this week, next 4 weeks), overdue tasks, triage queue size
5. **Team switcher:** Design and Marketing teams, each with its own columns and people; a person in both teams shows total load
6. **Demo login:** pick a seeded user from a list (Org Admin, Team Admin, Member) to show role differences

**Stretch (only if ahead by Thursday)**

- My Work view for members
- Time off request and approve flow (otherwise time off is seed data only)

**Out of the demo**

- SSO (Entra/Google), real auth, passwords
- Settings screens (statuses, request types and teams come from seed data)
- Comments, audit log, notifications, email
- Azure deployment (demo runs locally)
- Integrations, AI assistant, CSV export, mobile layout
- Full test coverage (smoke tests only)

## Stack and conventions

Use the full MVP stack now, with shortcuts only where they're easy to swap out later.

| Layer | Choice | Demo shortcut |
| --- | --- | --- |
| Backend | ASP.NET Core Web API, .NET 10 LTS, EF Core, controllers | None |
| Database | PostgreSQL via Docker Compose, EF Core migrations | Runs locally |
| Frontend | Angular (latest, standalone components, signals), Tailwind CSS | None |
| Drag-drop | Angular CDK drag-drop (board and capacity grid) | None |
| Capacity grid | Custom CSS grid component | No third-party scheduler |
| Auth | `IDemoAuth`: pick a seeded user, signed cookie | Swap for Entra ID/Google later behind the same interface |
| Run | `docker compose up` for Postgres; `dotnet run` and `ng serve` | No Azure |

**Conventions to keep from day one**

- `OrgId` on every table, `TeamId` on team-owned tables; EF Core global query filters for `OrgId`
- Access checks on the server from the current user's role and team memberships
- Dates as `DateOnly`; time zone Africa/Johannesburg; week starts Monday
- REST endpoints per resource (no whole-board saves); DTOs separate from entities
- Seed data in one idempotent seeder, run on startup in Development
- Repo layout: `/api` (solution), `/web` (Angular), `/docs` (this brief, plan.md)
- Clean, neutral UI: light theme, one accent colour, readable at 1280 px and up

**Naming**

- Product name: **Juggle** (working name; may change)
- Repo: `juggle`; .NET projects `Juggle.Api` and `Juggle.Api.Tests` in `api/Juggle.sln`; Angular project `juggle-web` in `web/`
- Keep the display name in one place per app: a `Branding` section in `appsettings.json` for the API and one constant in Angular, used for the page title, header and login screen. No product name hardcoded in UI text elsewhere
- Logo and accent colour come from one shared asset and one Tailwind theme colour, so a rebrand is a config change

## Data model

Twelve tables; the full model's comments, audit, notifications and custom request fields are left out.

| Entity | Key fields |
| --- | --- |
| Organisation | Id, Name, TimeZone |
| Team | Id, OrgId, Name, Colour |
| User | Id, OrgId, Name, Email, OrgRole (OrgAdmin/User), AvatarColour |
| TeamMembership | UserId, TeamId, Role (TeamAdmin/Member) |
| Person | Id, OrgId, UserId, JobTitle, Skills, HoursPerDay |
| Department | Id, OrgId, Name |
| WorkflowStatus | Id, OrgId, TeamId, Name, Order, Category (Todo/InProgress/Review/Done) |
| Request | Id, OrgId, TeamId, RequesterUserId, DepartmentId, Type, Title, Description, RequestedDueDate, Priority, Status (New/Accepted/Rejected), TaskId |
| Project | Id, OrgId, TeamId, DepartmentId, Name, Colour, DueDate |
| Task | Id, OrgId, TeamId, ProjectId, Title, Description, StatusId, AssigneePersonId, EstimateHours, DueDate, ReviewCycle, SortOrder, Link |
| Allocation | Id, OrgId, PersonId, ProjectId, TaskId (nullable), StartDate, EndDate, HoursPerDay, Notes |
| TimeOff / PublicHoliday | Id, OrgId, PersonId (null for holidays), StartDate, EndDate, Type, Status (Pending/Approved/Declined/Cancelled), Note, DeclineReason |

- One assignee per task for the demo (the full plan allows many)
- Allocation has no TeamId: its team comes from the project, so a person's load is totalled across teams
- Utilisation = allocated hours / (HoursPerDay x working days, minus time off and holidays)

## Screens and acceptance criteria

Six screens inside one app shell: a left nav, and a header with the team switcher and the current user.

**1. Demo login**

- [ ] Lists seeded users with name, role and team; clicking one signs in
- [ ] Header shows the user and a "Switch user" action

**2. Schedule**

- [ ] Rows = people in the current team; columns = weekdays (weekends shown as narrow shaded columns); view 1, 2, 4 or 8 weeks; previous/next/today
- [ ] Allocation bars show project colour, name and hours/day; one person can have several bars per day
- [ ] Each person shows utilisation for the period in load colour (green under 80%, amber 80 to 100%, red over 100%); a day over capacity is tinted red with the hours over
- [ ] Drag on empty cells to create an allocation (pick project, hours/day); drag a bar to move it; drag its edge to resize
- [ ] Saving an allocation that pushes a day over capacity shows a clash warning, but still allows it
- [ ] Time off and public holidays show as hatched blocks and reduce capacity
- [ ] Load includes allocations from other teams (shown greyed)

**3. Board**

- [ ] Columns come from the current team's workflow statuses (Design and Marketing differ)
- [ ] Cards show title, project colour, assignee avatar, due date (red if overdue), review cycle
- [ ] Drag between and within columns persists order and status
- [ ] Filter by assignee and project
- [ ] Clicking a card opens a drawer: edit title, description, assignee, estimate, due date, link; "Book on schedule" creates an allocation for the assignee

**4. Request form**

- [ ] Any user can submit: team, type, title, description, department, requested due date, priority
- [ ] On submit, show a confirmation and the request's status

**5. Triage inbox (Team Admin)**

- [ ] Lists New requests for the current team, newest first, with a count badge in the nav
- [ ] Accept: choose project, assignee, estimate, committed due date; creates a task in the first column after Triage (e.g. To Do)
- [ ] Reject with a reason

**6. Dashboard (Team Admin; default landing page for admins)**

- [ ] Utilisation bar per person for this week and the next 4 weeks
- [ ] Cards: overdue tasks, requests waiting in triage, people over capacity this week
- [ ] Work by department (task count)

**Roles**

- [ ] Members can't see Triage or Dashboard, and can only edit their own tasks
- [ ] Org Admin sees a team switcher option "All teams" on the schedule

## Seed data

Realistic, fictional data that tells the story; dates are relative to the current week so the demo never looks stale.

| Item | Seed |
| --- | --- |
| Organisation | "Stark Industries" (fictional; rename before the demo if needed) |
| Teams | Design (8 people), Marketing (4 people); 1 designer is also a Marketing member |
| Users | 1 Org Admin who is also Design Team Admin, 1 Marketing Team Admin, members, 3 requesters from other departments |
| People | Mix of 8 h/day and one part-timer at 5 h/day; job titles (UI Designer, Brand Designer, Motion Designer, Content Marketer...) |
| Departments | Marketing, Sales, HR, Product, Executive |
| Design statuses | Triage, To Do, In Design, Internal Review, With Requester, Changes Requested, Done |
| Marketing statuses | Triage, Planned, Writing, Review, Scheduled, Published |
| Projects | 8 to 10, each with a colour and department (e.g. Q1 Campaign, Website Refresh, Sales Deck, HR Onboarding Pack) |
| Tasks | About 40 spread across columns; 3 overdue; some with review cycle 2 or 3 |
| Allocations | 6 weeks (2 back, 4 ahead); most people 60 to 90% loaded; 1 person over 100% next week; 1 person under 40% |
| Time off | Approved leave for 2 Design people in the next 2 weeks; 1 Marketing person on sick leave this week ("Unavailable" to everyone but them and their admins); 1 pending request in Design for the demo |
| Public holidays | South African public holidays for the current and next year |
| Requests | 5 New in Design triage, 2 in Marketing, 3 already accepted |

- Use made-up names; no real staff names or company branding
- The seeder must be re-runnable (reset command) so the demo can start clean

## Build order

One milestone per day, each ending with something runnable. The schedule gets the most time because it's the hero.

| Day | Milestone | Done when |
| --- | --- | --- |
| Mon | Scaffold: repo, Docker Compose Postgres, .NET API, Angular shell with Tailwind, entities, migrations, seeder, demo login | App opens, a seeded user signs in, team switcher works |
| Tue | Board: statuses per team, task cards, drag-drop, task drawer, filters | Design and Marketing boards differ; moves persist after reload |
| Wed | Schedule: layout, bars, load colours, time off, week navigation | Schedule shows seeded load correctly, including cross-team people |
| Thu (am) | Schedule interactions: create, move, resize, clash warning, "Book on schedule" from task drawer | Allocations can be changed by drag and survive reload |
| Thu (pm) | Request form, triage inbox, accept/reject | Submitted request can be accepted into a board task |
| Fri | Dashboard, role checks, polish, empty states, seed reset, rehearse the demo script | Full demo script runs start to finish without errors |

**If time runs short, cut in this order**

1. Board filters
2. Resize on the schedule (keep create and move)
3. Work by department on the dashboard
4. Reject with reason (keep accept)

## Demo script

About 10 minutes, following one request from submission to booked capacity.

1. **Sign in as a requester** (Sales). Submit a request: "Sales deck for Q1 roadshow", due in 2 weeks
2. **Switch to the Head of Design.** The Dashboard opens; the triage badge and the "Requests in triage" card show the new request. Open Triage from the card
3. **Check capacity first:** open the schedule. Point out the red day (someone over capacity), the person on leave, and the under-loaded designer
4. **Accept the request:** assign it to the under-loaded designer, estimate 16 h, set a committed due date. It appears on the board in To Do
5. **Book it:** from the task drawer, "Book on schedule" for 4 h/day over 4 days. Back on the schedule, their load turns from green to amber
6. **Show a clash:** drag another allocation onto a full day; the clash warning appears
7. **Move work on the board:** drag a card to Internal Review, then to Changes Requested; the review cycle increases
8. **Dashboard:** utilisation per person, overdue tasks, triage queue now one shorter
9. **Time off:** switch to a designer; My work opens. "Request time off" for Monday and Tuesday of the week after next: the schedule shows a hatched "Pending" block, and their hours still count. Switch back to the Head of Design and approve it under Requests > Time off: the schedule shows the solid leave block and those days come off their capacity
10. **Switch team to Marketing:** different columns, different people. The shared designer's load includes Design work
11. **Close:** "The same tool works for every department; Design is the pilot." Then ask the discovery questions

## Coding standards

Simple and maintainable: no speculative abstractions, but clear structure that holds up after the demo. Copy this section into `CLAUDE.md` at the repo root.

**Principles**

1. Use the latest stable versions of libraries and idiomatic approaches as of today
2. Keep it simple. NEVER over-engineer, ALWAYS simplify. No speculative abstractions, no features outside this brief
3. Simple does not mean messy: clear names, small focused classes and components, one responsibility each
4. No unnecessary defensive programming. Validate at the boundaries (API input, external calls) and trust the code inside
5. Be concise. Keep the README minimal. IMPORTANT: no emojis ever
6. When hitting issues, identify the root cause before trying a fix. Do not guess. Prove it with evidence, then fix the root cause

**Backend (.NET)**

- Organise by feature (e.g. `Features/Tasks`, `Features/Allocations`), not by technical layer
- Controllers stay thin: validate input, call a service, return a DTO
- Never return EF entities from the API; map to DTOs
- Async all the way down; no `.Result` or `.Wait()`
- Enforce `OrgId` with EF Core global query filters and team access checks on the server, never in the UI only
- `DateOnly` for dates; no business logic in migrations
- Configuration through `appsettings` and environment variables; no secrets in the repo
- Built-in dependency injection, `ILogger` and ProblemDetails for errors

**Frontend (Angular)**

- Standalone components, signals for state, the new control flow (`@if`, `@for`)
- Organise by feature (e.g. `features/board`, `features/capacity`), with shared UI in `shared/`
- Components handle display; data access lives in services
- Strongly typed models that match the API DTOs; no `any`
- Tailwind for styling; no inline styles, and component CSS only when Tailwind can't do it

**Data and API**

- REST endpoints per resource with clear status codes (200, 201, 204, 400, 401, 403, 404)
- Every schema change goes through an EF Core migration
- Seed data lives in one idempotent seeder

**Definition of done for a milestone**

- Builds with no warnings and passes lint
- Smoke tests pass; add a test when fixing a bug
- Acceptance criteria for that milestone are met and ticked in plan.md
- Committed with a clear message describing what changed

## Instructions for Claude Code

Read this brief, create `CLAUDE.md` from the Coding standards section, then write `docs/plan.md` before writing any code.

**plan.md must contain**

- The six milestones from Build order, each split into small tasks with `- [ ]` checkboxes
- For each milestone: files to create or change, API endpoints, and the acceptance criteria copied from this brief
- Decisions and assumptions, listed at the top, for me to confirm
- A status line per milestone (Not started / In progress / Done)

**Working rules**

- Stop after writing plan.md and wait for my approval
- Work one milestone at a time; stop at the end of each for me to review and run it
- Keep the app runnable after every milestone; commit at the end of each one
- Tick off tasks in plan.md as you finish them
- Don't add features outside this brief; put ideas in a "Later" list in plan.md
- Add a short `README.md` with run steps (Docker Compose, API, web, seed reset)
- Smoke tests only: one API test per endpoint group, and one Playwright test for the demo happy path if time allows
- Ask before adding any paid library
