# Juggle Demo Plan

Build plan for the demo in `docs/demo-brief.md`. Demo due Fri 2026-10-30.

## Where we left off

| | |
| --- | --- |
| Current phase | C - Client demo for The Core Group |
| Phase status | Approved, not started |
| Last completed task | Stretch approved and tagged `demo-v2` |
| Next task | C.1 when the user says "Start Phase C" |
| Blockers / open questions | Financial year start for the demo org (see D52): confirm at the start of Phase C |
| Last updated | 2026-10-31 |

## Phase overview

| Phase | Day | Milestone | Status |
| --- | --- | --- | --- |
| 0 | Mon | Plan approved | Done |
| 1 | Mon | Scaffold + demo login | Done |
| 2 | Tue | Board | Done |
| 3 | Wed | Schedule (read) | Done |
| D | Tue | Design pass | Done |
| L | Tue | Schedule layout | Done |
| 4 | Thu am | Schedule interactions | Done |
| 5 | Thu pm | Requests + triage | Done |
| P | Fri | Post-Phase 5 round | Done |
| 6 | Fri | Dashboard, roles, polish, rehearsal | Done |
| S | Sat | Stretch: My work, time off | Done |
| C | - | Client demo for The Core Group | Approved, not started |

Status values: Not started, In progress, Awaiting review, Done. A phase is Done only after the user approves it at its review gate.

## Decisions and assumptions (confirmed 2026-10-26)

**Stack and tooling**

- D1 Versions: .NET 10 LTS, EF Core 10 with Npgsql, PostgreSQL 18 (`postgres:18` image), Angular latest stable at scaffold time, Tailwind CSS v4, Angular CDK, Node LTS, npm. Exact versions are checked at scaffold time
- D2 Solution file: .NET 10 creates `.slnx` by default; the brief names `Juggle.sln`. Recommendation: `api/Juggle.slnx`
- D3 Tests: xUnit v3, `WebApplicationFactory`, Testcontainers PostgreSQL (free, MIT; needs Docker running). Angular uses its default test runner. Playwright only if time allows
- D4 No AutoMapper or MediatR (both now commercial). Hand-written mapping. Validation with DataAnnotations and the automatic 400 ProblemDetails
- D5 IDs are `Guid` (version 7). Enums stored as strings. `Person.Skills` is a Postgres `text[]`
- D6 The Angular dev server proxies `/api` to the API, so the auth cookie is same-origin and no CORS setup is needed
- D7 The dev database password lives in `docker-compose.yml` and `appsettings.Development.json`. It is a local-only throwaway value, not a secret
- D8 Git: rename `master` to `main` and commit straight to `main`, one commit per phase. Phase 0 commits the brief, `CLAUDE.md` and this plan

**Data model**

- D9 Add `Request.RejectionReason` (nullable). The brief needs a reject reason but the model has no field for it
- D10 A `Person` is optional for a `User`: requesters are Users without a Person. A team's people are the Persons whose User has a membership in that team
- D11 `Request.Type` is a fixed list in code, shared by all teams: Presentation, Social, Print, Web, Video, Copy, Other
- D12 Demo login role labels: Org Admin, Team Admin, Member, Requester (Requester = no team membership)

**Business rules**

- D13 Working day = Mon-Fri, not a public holiday, not approved time off. Allocations count only on the person's working days, so leave and holidays set capacity to 0 for that day without creating false clashes
- D14 Day capacity = `Person.HoursPerDay`. Utilisation = allocated hours / capacity hours over the period; it can go above 100%
- D15 Cell load colour: green under 80%, amber 80 to 100%, red over 100%. Hours free = capacity minus allocated, never below 0
- D16 Clash: the save always succeeds; the response lists the days now over capacity and the UI shows a warning toast. No confirm dialog before saving
- D17 Time off is full days only. Only `Approved` time off reduces capacity; pending leave is shown but does not (changed 2026-10-31 for D47: the seed had only approved leave)
- D18 The Triage status is hidden on the board, because triage happens in the inbox. Accepting a request puts the task in the next status by `Order` (Design: To Do, Marketing: Planned)
- D19 Status categories. Design: Triage, To Do = Todo; In Design = InProgress; Internal Review, With Requester = Review; Changes Requested = InProgress; Done = Done. Marketing: Triage, Planned = Todo; Writing = InProgress; Review = Review; Scheduled, Published = Done
- D20 Review cycle starts at 1 and goes up by 1 when a task moves from a Review-category status to an InProgress-category status (sent back for changes). Cards show "R2", "R3" when the cycle is above 1
- D21 Overdue = due date before today (Africa/Johannesburg) and status category is not Done
- D22 Card order: the move endpoint takes `{ statusId, index }` and the server renumbers `SortOrder` within the column
- D23 Board filters run in the browser (about 40 tasks per team)
- D24 Permissions:
  - Org Admin can do everything in every team
  - Team Admin can do everything in their team
  - Member sees the board and schedule of their own teams, but only edits tasks assigned to them (including drag). The grid is read-only for Members
  - Requester sees only the request form
- D25 Allocations from another team show greyed and cannot be edited from the current team's grid. "All teams" (Org Admin only, grid only) shows every person and every bar is editable
- D26 Landing pages: admins go to the dashboard, Members to My work (D46), Requesters to "My requests" (changed 2026-10-31 for the stretch: Members went to the board; 2026-10-30 after demo-v1: admins went to the schedule; Phase 5 review: requesters went to the request form). Switching team keeps the current page when the role allows it, otherwise the role's landing page
- D27 Dashboard: per person, one bar for this week and one for the next 4 weeks combined. "Over capacity this week" = at least one red day this week. "Work by department" counts open (not Done) tasks of the current team, grouped by the project's department
- D28 "Book on schedule" opens a small form: start date (default next working day), number of working days, hours/day (default estimate / days). It creates an allocation linked to the task
- D29 Add allocation delete (button in the bar's edit popover), so a wrong drag during the demo can be undone. Small addition beyond the brief
- D30 (changed 2026-10-30, Phase 5 review) Every user has a "My requests" page: their own requests, newest first, each opening a detail page with all fields, the status, and the rejection reason or, once accepted, the assignee and committed due date (from the task, so it follows reassignment). Sending a request opens its detail page, which replaces the confirmation page. The request form keeps to about 720px with a sticky 320px "What happens next" and tips panel beside it, centred together in the page (below 1100px the panel goes under the form), an exception to the full-width page rule. Request pages hide the header team switcher; the form's team starts as the last team viewed
- D42 (2026-10-30, post-Phase 5 round) Tasks can be added on the board: "Add task" at the bottom of each column and in the board header (the first column after Triage). Title and project are required; assignee, estimate, due date and link are optional; no description (added later in the task drawer). The task goes at the end of the column. Team Admins (and Org Admins) assign anyone in the team or no one; Members must assign the task to themselves, since they can only edit their own tasks (D24). Enforced in the API (`POST /api/teams/{teamId}/tasks`: 403 for non-members and for a Member assigning anyone else, 400 for Triage or another team's project or status). People outside the team still use New request
- D43 (2026-10-30, post-Phase 5 round) Side menu: Dashboard (admins), Schedule and Board, then a "Requests" group with Triage (admins, with its count), My requests and New request, in the same order in the rail's flyout (order changed after demo-v1; was Schedule, Board, Dashboard and My requests, New request, Triage). The group opens whenever one of its pages is shown and otherwise stays as the user left it (not saved); the Triage count shows on the group while it is closed. A toggle at the bottom shrinks the menu to a 64px icon rail (width eased over 150ms, none under reduced motion), remembered per user in this browser (`juggle.nav.collapsed.<userId>`); in the rail, labels become tooltips, the count becomes a dot, and the group opens as a CDK Menu flyout. The group has a paper-airplane icon; each item in it has its own 16px icon (list, plus-circle, inbox), starting where the group's label starts, in the menu and the flyout alike. Tooltips are a shared `appTooltip` directive on CDK Overlay
- D34 Moving a bar can change its dates and its person (drop on another row in the same team)
- D35 The capacity grid page is called "Schedule" in all UI text. Routes (`/t/:teamId/capacity`), the API (`/api/capacity`) and code names keep "capacity"
- D44 (2026-10-30) User-facing text, including API error messages, calls allocations "bookings" and uses "book", never "allocation" or "allocate". Code, routes and API names keep "allocation" (as D35 does for capacity)
- D45 (2026-10-30, Phase 6) Dashboard: `GET /api/dashboard?teamId=<id>|all` (shaped like `/api/capacity`, since "all" is not a team route); Team Admins of the team, or Org Admins; "All teams" only for Org Admins, offered by the team switcher on the dashboard as on the schedule. "This week" is Monday to Friday of the current week and "next 4 weeks" the four weeks after it (D27), computed by `CapacityService`, so leave, holidays and other teams' bookings count as on the schedule. Summary cards link to the board with `?due=overdue` (a new "Due: Any date / Overdue" board filter), to Triage and to the schedule; with "All teams" the overdue and triage cards link to each team on its own line, since the board and triage are per team. Utilisation lists the busiest this week first, in the schedule's colours (available, green, amber, red) with a legend. Work by department uses one neutral bar colour (`ink-faint`). Board collapse (L.11): while a filter is on, the columns it leaves empty collapse before the usual order, so the matching cards stay in view
- D36 Only Team Admins (and Org Admins) change a task's assignee. Members edit every other field of their own tasks. Assigning work is a capacity decision for the lead, and a Member who reassigns a task would lose access to it. **Demo default only:** after the MVP this becomes a setting Team Admins and Org Admins can change (see "Members reassigning tasks" under Later)
- D37 (2026-10-27, design pass) Schedule cells show no hours free. Load colour (D15) is shown on each person's utilisation for the days shown (D14), and a day over capacity is tinted red with the hours over ("+2h")
- D41 (2026-10-30, Phase 4 review) The schedule reacts live while dragging, as Resource Guru does. The dragged booking is its own preview: the grid shows the bookings as the drop would leave them, snapped to whole days, and recomputes every day's booked hours from them in the client (the same rule as the API), so stacking, availability strips, utilisation and "Overbooked" update live with no API calls until the drop. Each snap eases over 120ms (FLIP with the Web Animations API) and row height over 150ms (every row has the same number of lane tracks, unused ones 0 high, so `grid-template-rows` can interpolate); both are off under `prefers-reduced-motion`. A drop or popover save that puts someone over capacity opens a "Booking clash" dialog (Cancel puts it back; "Book with overtime" saves) in place of the warning toast. Drag on empty days opens the popover with "Booking" and "Time off" tabs; "Time off" asks for time off on the viewer's own row (D47; it was disabled until the API could create time off)
- D40 (2026-10-30, Phase 4 review; replaced by D41) Schedule drags are drawn in two layers. The snapped result (a dashed outline, and the target row tinted) comes from signals that change only when the pointer crosses a cell. The outline is the drop laid out by `placeBars` with the row's other bookings, so it is one booking tall, in the lane the booking will take, its full length, and cut at weekends and days off exactly as after the drop; it has no fill. The movement in between is drawn once per animation frame with paint-only styles (`translate` for a move, `clip-path` for a resize or a new booking's days), so nothing lays out while the pointer moves. A press lifts a booking at once; it becomes a drag after 3px, so a click still opens it. Esc cancels; nothing is saved until release
- D39 (2026-10-28, Phase 4) Schedule drags use pointer events for create, move and resize alike, with a hit test on the day cells, instead of CDK drag for moves: CDK drag does not snap to CSS grid cells or move between rows. A move shifts both dates by working days, so a booking keeps its length across a weekend. "Book on schedule" defaults: start on the next working day; days = estimate / 4h, at least 1; hours/day = estimate / days to the nearest half hour, or 4h without an estimate (16h books 4 days at 4h/day, as in the demo script)
- D38 (2026-10-27, schedule layout) Fixed-width day columns with narrow weekend columns and week labels; 1, 2, 4 or 8 weeks, opening on 4; an availability strip per row; two-line bookings split at weekends and days off; time off as solid ink blocks; today tinted; utilisation under 50% shown as available. The capacity API accepts `weeks=8` and sends each allocation's project department

**Seed**

- D31 Org "Stark Industries", as in the brief. Design has 8 people, including the Head of Design (Org Admin and Design Team Admin) and one part-timer at 5 h/day. Marketing has 4 people: Marketing Lead (Team Admin), 2 marketers and the shared Brand Designer. Total 11 people and 14 users, with requesters from Sales, HR and Product
- D32 Seed dates are relative to the week the seed runs; run the reset before the demo. Reset: `dotnet run --project api/Juggle.Api -- --reset-demo` (drops the database, migrates, seeds)
- D33 SA public holidays are calculated for the current and next year (fixed dates, Easter-based dates, Sunday holidays moved to Monday)

## Review gate (ends every phase)

Copied into each phase below. Nothing in the next phase starts until the last box is ticked.

- Build passes with no warnings, lint passes, smoke tests pass
- Acceptance criteria ticked
- Committed as `Phase N: <milestone>`
- "Where we left off" and the phase status updated to Awaiting review
- **STOP.** Post a review summary: what was built, how to run it, what to click to check it, any deviations from this plan. Wait for the user
- Approved by user: review fixes committed, status set to Done

---

## Phase 0 - Plan

**Status:** Done

- [x] 0.1 Read the brief
- [x] 0.2 Create `CLAUDE.md`
- [x] 0.3 Write `docs/plan.md`
- [x] 0.4 Decisions D1-D34 confirmed (update this plan with any changes)
- [x] 0.5 Initial commit on `main` (brief, `CLAUDE.md`, plan)

**Review gate**

- [x] Plan and `CLAUDE.md` committed
- [x] "Where we left off" updated
- [x] **STOP** for review
- [x] Approved by user

---

## Phase 1 - Scaffold + demo login (Mon)

**Status:** Done
**Done when:** the app opens, a seeded user signs in, the team switcher works

**Files**

- Root: `docker-compose.yml`, `.gitignore`, `.editorconfig`, `README.md`
- API: `api/Juggle.slnx`, `api/Directory.Build.props`, `api/Juggle.Api/Program.cs`, `appsettings.json` (Branding), `appsettings.Development.json` (connection string)
- API data: `Data/JuggleDbContext.cs`, `Data/Entities/*.cs`, `Data/Migrations/*`, `Data/Seed/DemoSeeder.cs`, `Data/Seed/SouthAfricanHolidays.cs`
- API auth: `Auth/IDemoAuth.cs`, `Auth/CookieDemoAuth.cs`, `Auth/CurrentUser.cs`, `Auth/TeamAccess.cs`, `Common/OrgClock.cs`
- API features: `Features/Auth/{AuthController, AuthDtos}.cs`, `Features/Teams/{TeamsController, TeamDtos}.cs`
- Tests: `api/Juggle.Api.Tests/ApiFactory.cs`, `AuthTests.cs`
- Web: `web/` (`juggle-web`), `web/proxy.conf.json`, `src/styles.css` (Tailwind theme accent), `public/logo.svg`, `src/app/{app.config.ts, app.routes.ts, branding.ts}`
- Web core: `core/{models.ts, auth.service.ts, team-context.service.ts, guards.ts}`
- Web layout: `layout/{shell, nav, header, team-switcher}`
- Web features: `features/login/*`, placeholder pages for capacity, board, triage, dashboard, request

**Endpoints**

- `GET /api/auth/demo-users` (anonymous)
- `POST /api/auth/sign-in` `{ userId }` -> 204, sets cookie
- `POST /api/auth/sign-out` -> 204
- `GET /api/auth/me` -> user, org role, person id
- `GET /api/teams` -> teams the user can see, with their role in each

**Tasks**

- [x] 1.1 Rename branch to `main`; add `.gitignore` and `.editorconfig`
- [x] 1.2 `docker-compose.yml`: Postgres 18, named volume, healthcheck
- [x] 1.3 Create solution, `Juggle.Api` (controllers) and `Juggle.Api.Tests`; `Directory.Build.props` with nullable, implicit usings, warnings as errors
- [x] 1.4 Add packages: Npgsql EF Core provider, EF Core Design, OpenAPI; tests: Mvc.Testing, Testcontainers.PostgreSql
- [x] 1.5 Entities for the 12 tables (plus `RejectionReason`) and enums
- [x] 1.6 `JuggleDbContext`: configurations, `OrgId` global query filters, enums as strings
- [x] 1.7 Initial migration
- [x] 1.8 `OrgClock`: today in Africa/Johannesburg, Monday week start
- [x] 1.9 Auth: cookie scheme, `IDemoAuth` / `CookieDemoAuth`, `CurrentUser` from claims, `TeamAccess` (can view / can manage team)
- [x] 1.10 ProblemDetails, logging, `Branding` options
- [x] 1.11 `DemoSeeder` (idempotent, runs on startup in Development, `--reset-demo` flag):
  - [x] Organisation, departments, teams, users, memberships, people
  - [x] Design and Marketing workflow statuses
  - [x] 8 to 10 projects with colours and departments
  - [x] About 40 tasks across columns; 3 overdue; some with review cycle 2 or 3
  - [x] Allocations for 6 weeks (2 back, 4 ahead): most at 60 to 90%, one over 100% next week, one under 40%
  - [x] Time off for 2 people in the next 2 weeks
  - [x] SA public holidays for the current and next year
  - [x] Requests: 5 New in Design, 2 New in Marketing, 3 Accepted
- [x] 1.12 `AuthController` and `TeamsController`
- [x] 1.13 Smoke test: `ApiFactory` (Testcontainers) and `AuthTests`
- [x] 1.14 Scaffold `juggle-web` in `web/`; add Tailwind, angular-eslint, Angular CDK, dev proxy
- [x] 1.15 Branding: `branding.ts` constant, accent colour in the Tailwind theme, `logo.svg`
- [x] 1.16 Core: models, `AuthService`, `TeamContextService`, auth and role guards
- [x] 1.17 Shell: left nav (role-aware), header with team switcher, current user, "Switch user"
- [x] 1.18 Login page; landing redirect per role
- [x] 1.19 Routes `/login`, `/t/:teamId/{capacity,board,triage,dashboard}`, `/request` with placeholder pages
- [x] 1.20 `README.md`: Docker Compose, API, web, seed reset

**Acceptance criteria**

- [x] Lists seeded users with name, role and team; clicking one signs in
- [x] Header shows the user and a "Switch user" action

**Notes and deviations**

- Small data model additions: `User.DepartmentId` (requesters show their department on the login screen), `Request.CreatedAt` (triage sorts newest first), `TimeOff.Description` (holiday names), `TeamMembership.OrgId` (OrgId on every table)
- The task entity is `TaskItem` (table `Tasks`) to avoid clashing with `System.Threading.Tasks.Task`
- `global.json` (opts `dotnet test` into Microsoft.Testing.Platform, required by xUnit v3 on .NET 10) and the `dotnet-ef` tool manifest live at the repo root
- API errors: services throw `NotFoundException` / `ForbiddenException` / `BadRequestException`, mapped to ProblemDetails by `ApiExceptionHandler`
- Data-driven colours (avatars, later project colours) use `[style.background-color]` bindings, since Tailwind cannot generate classes for runtime values

**Review gate**

- [x] Build passes with no warnings, lint passes, smoke tests pass
- [x] Acceptance criteria ticked
- [x] Committed as `Phase 1: Scaffold and demo login`
- [x] "Where we left off" and status updated to Awaiting review
- [x] **STOP** for review
- [x] Approved by user (2026-10-27)

---

## Phase 2 - Board (Tue)

**Status:** Done
**Done when:** Design and Marketing boards differ; moves persist after reload

**Files**

- API: `Features/Teams` (statuses, projects, people), `Features/Tasks/{TasksController, TasksService, TaskDtos}.cs`
- Tests: `TasksTests.cs`
- Web: `features/board/{board-page, board-column, task-card, task-drawer, board-filters, board.service}`, `shared/{avatar, drawer, toast.service, toasts, select-chevron}`

**Endpoints**

- `GET /api/teams/{teamId}/statuses`
- `GET /api/teams/{teamId}/projects`
- `GET /api/teams/{teamId}/people`
- `GET /api/teams/{teamId}/tasks`
- `PUT /api/tasks/{id}`
- `POST /api/tasks/{id}/move` `{ statusId, index }`

**Tasks**

- [x] 2.1 Team endpoints: statuses, projects, people
- [x] 2.2 Task endpoints: list, update (Members only their own tasks)
- [x] 2.3 Move endpoint: status change, column reorder, review cycle rule (D20)
- [x] 2.4 Smoke test: `TasksTests`
- [x] 2.5 Shared UI: avatar, drawer, toast
- [x] 2.6 Board page: columns from statuses (Triage hidden), task cards
- [x] 2.7 CDK drag-drop within and between columns, persisted via the move endpoint
- [x] 2.8 Task drawer: edit title, description, assignee, estimate, due date, link
- [x] 2.9 Filters by assignee and project
- [x] 2.10 Member restriction in the UI: only own cards draggable and editable

**Acceptance criteria**

- [x] Columns come from the current team's workflow statuses (Design and Marketing differ)
- [x] Cards show title, project colour, assignee avatar, due date (red if overdue), review cycle
- [x] Drag between and within columns persists order and status
- [x] Filter by assignee and project
- [x] Clicking a card opens a drawer: edit title, description, assignee, estimate, due date, link ("Book on schedule" is built in Phase 4)

**Notes and deviations**

- Review fix (D36): Members can no longer reassign their own tasks. The API returns 403 and the drawer shows the assignee read-only with "Ask a team admin to reassign this task."
- No `GET /api/tasks/{id}`: the drawer uses the board's data and `PUT` returns the saved task, so nothing needed it
- The service is `TasksService`, matching `TeamsService`
- `TaskDto.IsOverdue` is computed on the server with the org's date (D21), so the browser's time zone cannot change it
- Triage is hidden as the first status by `Order` (D18)
- Moves update the board straight away; if the API refuses, a toast shows the reason and the board reloads
- Dragging while a filter is active drops the card just before the visible card it lands on (`move-task.ts`, unit tested)
- The drawer uses Angular signal forms (stable in Angular 22)
- Shared control styles (`form-input`, `form-select`, `compact-select`, `btn-primary`, `btn-secondary`) live in `styles.css`; the select arrow is a shared `SelectChevron` component, now also used by the team switcher
- Test fix: `ApiFactory` now starts the server in `InitializeAsync`. With two test classes running in parallel, both called `CreateClient()` at once, the factory built two servers, and both seeded the same database (unique email violation)
- Running `--reset-demo` while the API is up makes the API's next request fail once (its pooled connection was closed by the drop); reset before starting the API

**Review gate**

- [x] Build passes with no warnings, lint passes, smoke tests pass
- [x] Acceptance criteria ticked
- [x] Committed as `Phase 2: Board`
- [x] "Where we left off" and status updated to Awaiting review
- [x] **STOP** for review
- [x] Approved by user (2026-10-27)

---

## Phase 3 - Schedule, read (Wed)

**Status:** Done
**Done when:** the grid shows seeded load correctly, including cross-team people

**Files**

- API: `Features/Capacity/{CapacityController, CapacityService, CapacityCalculator, CapacityDtos}.cs`
- Tests: `CapacityTests.cs` (endpoint smoke test and calculator unit test)
- Web: `features/capacity/{capacity-page, capacity-grid, person-row, allocation-bar, grid-toolbar, capacity.service, grid-layout.ts}`, `shared/{dates.ts, load-colour.ts}`

**Endpoints**

- `GET /api/capacity?teamId={id|all}&start=YYYY-MM-DD&weeks=1|2|4` -> weekdays, people with per-day load (capacity, allocated, time-off reason), allocations (with an `otherTeam` flag)

**Tasks**

- [x] 3.1 `CapacityCalculator`: working days, day capacity, day load (D13-D15); unit test
- [x] 3.2 `CapacityService` and controller
- [x] 3.3 Smoke test: `CapacityTests`
- [x] 3.4 Shared `dates.ts` and `load-colour.ts`
- [x] 3.5 Grid layout: CSS grid, sticky person column, weekday columns, week headers
- [x] 3.6 Toolbar: 1, 2 or 4 weeks; previous, next, today
- [x] 3.7 Allocation bars stacked in lanes: project colour, name, hours/day
- [x] 3.8 Cell load colour and hours free
- [x] 3.9 Time off and public holidays as hatched blocks
- [x] 3.10 Other-team allocations greyed
- [x] 3.11 "All teams" option for Org Admin

**Acceptance criteria**

- [x] Rows = people in the current team; columns = weekdays; view 1, 2 or 4 weeks; previous/next/today
- [x] Allocation bars show project colour, name and hours/day; one person can have several bars per day
- [x] Each cell shows load colour (green under 80%, amber 80 to 100%, red over 100%) and hours free
- [x] Time off and public holidays show as hatched blocks and reduce capacity
- [x] Load includes allocations from other teams (shown greyed)
- [x] Org Admin sees a team switcher option "All teams" on the schedule

**Notes and deviations**

- The server works out each person's day load (`CapacityCalculator`) and sends it with the reason for any day off, so the browser only draws it; Phase 6's dashboard can reuse the same rules
- A red day shows "2h over" rather than "0h free" (D15 keeps hours free at 0 or more, so the label shows how far over instead); the 4-week view uses short labels ("2h", "+2")
- Time off is a hatched block across the person's bars on those days, since allocations do not count on days off (D13)
- "All teams" is the URL `/t/<team>/capacity?teams=all`, so the nav and guards keep working with a real team; picking a team clears it
- The view opens on 2 weeks, so the demo shows this week and next week (Lerato over capacity, Amahle on leave) together
- Grid placement (`grid-column`, `grid-row`) uses style bindings, like project colours, since the positions come from data
- No public holiday falls in the next 4 weeks of the seed; paging forward to December shows Christmas Day and New Year's Day

**Review gate**

- [x] Build passes with no warnings, lint passes, smoke tests pass
- [x] Acceptance criteria ticked
- [x] Committed as `Phase 3: Schedule`
- [x] "Where we left off" and status updated to Awaiting review
- [x] **STOP** for review
- [x] Approved by user (2026-10-27)

---

## Design pass (between Phase 3 and Phase 4)

**Status:** Done
**Done when:** the app looks calm, soft and consistent, built only from the design tokens; Schedule and Board screenshots reviewed at 1440px

Requested by the user on 2026-10-27, with `docs/design-reference.png` for mood only. UI only: no API, route or behaviour change. The one data change (approved) is the seed colours, which move to the 8-hue palette.

**Tasks**

- [x] D.1 Tokens in one `@theme` block in `styles.css`: colours, radius, shadows, fonts, caps tracking; Tailwind's default palette cleared so only tokens can be used
- [x] D.2 Space Grotesk and Manrope, self-hosted with `@fontsource-variable/*` (OFL)
- [x] D.3 Shared classes: `panel`, `label-caps`, `page-title`, buttons (primary, secondary, quiet, pill), inputs, `pill-select`, `empty-state`; `hue-*` utilities for data colours
- [x] D.4 Seed colours from the palette (projects, avatars, teams); logo on the new accent
- [x] D.5 Shell: lighter sidebar, clear active nav, header without borders, caps team switcher
- [x] D.6 Board: white columns with an amber bar and "N CARDS", soft cards with a project dot, empty column state
- [x] D.7 Schedule: tinted bars with a coloured edge and "Project · 4h/day", utilisation column, over-capacity tint with "+2h", today line, no "Xh free" pill (D37)
- [x] D.8 Drawer, toasts, login and placeholder pages on the tokens
- [x] D.9 "Design" section in `CLAUDE.md`

**Notes and deviations**

- D37 Schedule cells no longer show hours free. Load colour (D15) moves to each person's utilisation figure for the days shown (D14), and a red day is tinted with the hours over ("+2h"). The day tooltip still shows "6h of 8h booked". The brief's acceptance criterion was updated to match
- The initial bundle warning budget went from 500 kB to 600 kB. The JS was already 472 kB, and the fonts and new classes took the total to 504 kB. Phases 4 to 6 add more code
- The today line is one element across the rows, behind the bars, so it stays continuous; person rows are placed explicitly so it can span them
- Bars use a 6px radius (`rounded-bar`) so the 3px coloured edge reads as a straight edge
- Screenshots were taken against a separate copy of the API on its own database (`juggle_screenshots`), so the running dev API and its data were left alone. Run `--reset-demo` on the dev database to pick up the new seed colours

**Review gate**

- [x] Build passes with no warnings, lint passes, smoke tests pass
- [x] Screenshots of Schedule and Board at 1440px reviewed and fixed
- [x] Committed as `Design pass: calm, soft UI from tokens`
- [x] "Where we left off" and status updated to Awaiting review
- [x] **STOP** for review
- [x] Approved by user (2026-10-27)

---

## Schedule layout (between Phase 3 and Phase 4)

**Status:** Done
**Done when:** the schedule reads at a glance like a resource planner (a reference screenshot, kept outside the repo, for structure only); screenshots at 1440px reviewed

Requested by the user on 2026-10-27, after the design pass. Design tokens unchanged.

**Tasks**

- [x] L.1 API: `weeks` accepts 1, 2, 4 or 8; each allocation carries its project's department (`ProjectDepartment`); tests updated
- [x] L.2 Fixed 56px day columns, a narrow shaded weekend column after each week, week labels ("W44 · 26 Oct") and a strong Monday divider; opens on 4 weeks, scrolls sideways
- [x] L.3 Availability strip per row: free, full or over per working day, with "6h of 8h booked"
- [x] L.4 Booking blocks: 40px, "4h/day" then "Project · Department", split at weekends and days off, one lane per booking
- [x] L.5 Time off and public holidays as solid ink blocks: reason, then the dates of the whole run
- [x] L.6 Taller rows; name, job title and hours/day each on their own line; utilisation under 50% in the accent ("available")
- [x] L.7 Today tinted `accent-50` down the whole column instead of a line
- [x] L.8 Seed: realistic bookings (2 days to 3 weeks, mid-week starts, gaps, lighter further out, weeks -1 to 5); Sipho's leave added, over a weekend
- [x] L.9 Layout helpers tested: `dayColumn`, `placeBars`, `timeOffBlocks`, `isoWeek`, `utilisationLevel`, `dayState`
- [x] L.10 Responsive (2026-10-27): schedule days flex from 56px (weekend fixed) and scroll only below that; board columns share the width equally (272 to 360px), fill the height and scroll their own cards; only the board area or schedule panel scrolls sideways, never the page; thin, quiet scrollbars
- [x] L.11 Board tweaks (2026-10-27): column minimum 240px; soft fade on an edge with more to scroll to (CSS scroll-driven mask); collapsible columns (narrow strip with name and card count, still a drop target). Automatic collapse: all columns expanded when they fit at their minimum width; otherwise columns collapse one at a time until they fit (Done-category columns first, then the rest right to left, so To Do stays open longest; one always stays expanded; changed 2026-10-30, was "from the edges inward"); recalculated as the board area resizes. Collapse rules (2026-10-28): a manual collapse holds at any width and is remembered per user (`juggle.board.collapsed.<userId>`, a list of column ids); a manual expand is not remembered; after any click the columns stay as the user left them (the board scrolls) until the next resize or page load. A card dropped on a collapsed column expands that column, held the same way and not saved (2026-10-30, Phase 6 review), then the automatic rules apply again; widening re-expands only automatically collapsed columns. The old `juggle.board.columns.*` keys are cleared on load
- [x] L.12 Availability strip as mini fill bars: booked share in `ink-faint`, free share in `ok-500`, all `over-500` when over capacity, no segment on days off; strip 6px tall
- [x] L.13 Shared `<app-select>` (CDK Overlay + Listbox, ControlValueAccessor) replaces every native select: team switcher, board filters, task drawer. Text, avatar and colour-dot options; search box above 8 options; keyboard, type-ahead, Escape and outside click; works in the drawer. The request and triage forms (Phase 5) will use it

**Notes and deviations**

- D38 Schedule layout: fixed-width days, weekend columns, 1/2/4/8 weeks (opens on 4), availability strip, two-line bookings split at weekends and days off, solid ink time off, today tint, "available" utilisation under 50%. The "+2h" labels were removed: the red strip segment, the soft red day tint and the tooltip show a day over capacity
- The weekend is one narrow column per week (Saturday and Sunday together), since nothing is booked on it
- A one-day time-off block (most public holidays) shows "Off"; the full name and date are in its tooltip, because no label fits 56px
- Week labels stick beside the people column while a week scrolls under it
- CSS cannot nest `repeat()`, so the grid columns repeat a six-track list per week
- The 8-week view failed against the running dev API with 400 ("The Weeks field does not equal any of the values specified in AllowedValuesAttribute"). Root cause: that API process was started before `weeks=8` was allowed and was never restarted (its responses still had the old seed colours). The code is correct (the API test and the screenshot copy return 40 days); restart the API with `--reset-demo`
- `main` never scrolls sideways (`overflow-x-hidden`); the schedule panel and the board area scroll inside themselves
- A card dropped on a collapsed column goes to the top of it. Only manual collapses are saved (per user, in localStorage, so not across devices); the automatic collapse is worked out from the board width each time
- The edge fade uses a scroll-driven animation; browsers without scroll timelines show no fade, and nothing else changes
- The select works with Signal Forms `[formField]` through its ControlValueAccessor (Angular uses the accessor before a `value` model). ESLint knows `app-select` as a form control for `<label>` association. Fixed while testing: the CDK listbox throws in dev mode when its value has no matching option, which a search would cause; the listbox now gets the value only while that option is shown

**Review gate**

- [x] Build passes with no warnings, lint passes, smoke tests pass
- [x] Screenshots at 1440px reviewed and fixed; responsive check at 1280, 1440 and 1920px (schedule 1/2/4/8 weeks, Design and Marketing boards)
- [x] Committed as `Schedule layout: resource-planner pattern`
- [x] "Where we left off" and status updated to Awaiting review
- [x] **STOP** for review
- [x] Approved by user (2026-10-27)

---

## Phase 4 - Schedule interactions (Thu am)

**Status:** Done
**Done when:** allocations can be changed by drag and survive reload

**Files**

- API: `Features/Allocations/{AllocationsController, AllocationService, AllocationDtos}.cs`
- Tests: `AllocationsTests.cs`
- Web: `features/capacity/{allocation-popover, drag-create.ts, resize-handle}`, `features/board/book-on-grid-dialog`

**Endpoints**

- `POST /api/allocations` -> 201 with allocation and clash days
- `PUT /api/allocations/{id}` -> 200 with allocation and clash days
- `DELETE /api/allocations/{id}` -> 204

**Tasks**

- [x] 4.1 `AllocationService`: create, update, delete; input validation; permission by the project's team; clash days (D16)
- [x] 4.2 `AllocationsController`; smoke test `AllocationsTests`
- [x] 4.3 Drag across empty cells to pick a date range (pointer events), then popover: project, hours/day
- [x] 4.4 Move a bar with CDK drag, snapped to cells (dates and person, D34)
- [x] 4.5 Resize a bar by its edge
- [x] 4.6 Click a bar: edit popover (hours/day, notes, delete)
- [x] 4.7 Clash warning toast
- [x] 4.8 "Book on schedule" dialog in the task drawer (D28)
- [x] 4.9 Grid read-only for Members

**Acceptance criteria**

- [x] Drag on empty cells to create an allocation (pick project, hours/day); drag a bar to move it; drag its edge to resize
- [x] Saving an allocation that pushes a day over capacity shows a clash warning, but still allows it
- [x] Task drawer: "Book on schedule" creates an allocation for the assignee

**Notes and deviations**

- Moves use pointer events, not CDK drag (D39); the web files are `schedule-drag.ts` (tested drag rules), `allocation-popover.ts`, and resize handles inside `allocation-bar.ts`; the drawer form is `book-on-schedule.ts`
- The API returns `SavedAllocationDto` (the allocation and its clash days) rather than the schedule's `AllocationDto`, which depends on the team being viewed. After each save the schedule reloads, so load and utilisation come from the server. A moved or resized booking shows in its new place at once, before the save answers
- Validation: end on or after start, at most a year, 0.5 to 24 h/day, the person in the project's team, the task in the project. Changing a booking needs Team Admin on its project's team (the old and the new project); Org Admins can change any
- A click on a booking opens its popover (project, hours/day, notes, delete); Enter does the same from the keyboard. The days picked for a new booking stay highlighted while its popover is open
- "All teams" lists every team's projects when booking; the API rejects a person who is not in the project's team with a clear message
- Board and Schedule pages are now lazy-loaded: the initial bundle had passed the 600 kB budget (603 kB) because every page was in it; it is now 448 kB
- Checked in Chromium at 1920 against a separate API and web server on a throwaway database (`juggle_check`, dropped afterwards), so the demo data was untouched: create, move to another person, resize, reload, clash warning, edit, delete, Escape, "Book on schedule", and a Member's read-only grid and drawer. No console errors
- Review fix (D40): drags felt unresponsive because the pointer was reduced to a day index and the booking was redrawn by its grid columns, so nothing moved until a cell boundary. Now `drag-follow.ts` draws the pointer movement and the grid keeps the snapped state; resize grips show on hover. Checked in Edge against `juggle_check` (dropped afterwards): 40 pointer moves cost 3 layouts (one per cell crossed), no writes until the drop, one PUT on drop, Esc restores, a click still opens the popover
- Review fix 3 (D41): live re-layout was blocked because day loads came only from the server, the drag never changed the data the grid drew (it was painted on top), and `repeat(lanes, …)` changed the track count, which CSS cannot animate. The outline and `drag-follow.ts` are gone; `live-load.ts` adds up day loads, `snap-animation.ts` eases snaps, `clash-dialog.ts` asks before overbooking. Checked in Edge against `juggle_check`: move, clash (Cancel and "Book with overtime"), resize, create and reduced motion; no writes until the drop
- Review fix 2 (D40): the outline spanned every lane on top of other bookings, was the moved dates clipped to the days shown (a booking running off the window looked a different length from its outline), and had a faint fill that showed as a ghost beside the live bar. It is now laid out by `placeBars` like a real booking, with no fill. Checked in Edge for a move, a resize from each end and a create: each outline matched where the booking landed (same person, lane, days and size)

**Review gate**

- [x] Build passes with no warnings, lint passes, smoke tests pass
- [x] Acceptance criteria ticked
- [x] Committed as `Phase 4: Schedule interactions`
- [x] "Where we left off" and status updated to Awaiting review
- [x] **STOP** for review
- [x] Approved by user (2026-10-30, after review fixes D40 and D41)

---

## Phase 5 - Requests + triage (Thu pm)

**Status:** Done
**Done when:** a submitted request can be accepted into a board task

**Files**

- API: `Features/Requests/{RequestsController, RequestService, RequestDtos}.cs`
- Tests: `RequestsTests.cs`
- Web: `features/requests/{request-form, request-confirmation, requests.service}`, `features/triage/{triage-page, accept-dialog, reject-dialog}`, nav badge in `layout/nav`

**Endpoints**

- `GET /api/requests/options` -> teams, departments, types, priorities
- `POST /api/requests` -> 201
- `GET /api/requests/{id}`
- `GET /api/teams/{teamId}/requests?status=New`
- `POST /api/requests/{id}/accept` `{ projectId, assigneePersonId, estimateHours, dueDate }`
- `POST /api/requests/{id}/reject` `{ reason }`

**Tasks**

- [x] 5.1 `RequestService` and controller: options, create, get, list, accept (task in the status after Triage, D18), reject
- [x] 5.2 Smoke test: `RequestsTests`
- [x] 5.3 Request form page (dropdowns use the shared `<app-select>`)
- [x] 5.4 Confirmation page with status
- [x] 5.5 Triage inbox, newest first
- [x] 5.6 Nav count badge, refreshed after accept or reject
- [x] 5.7 Accept dialog (assignee and other dropdowns use `<app-select>`)
- [x] 5.8 Reject dialog with reason

**Acceptance criteria**

- [x] Any user can submit: team, type, title, description, department, requested due date, priority
- [x] On submit, show a confirmation and the request's status
- [x] Lists New requests for the current team, newest first, with a count badge in the nav
- [x] Accept: choose project, assignee, estimate, committed due date; creates a task in the first column after Triage (e.g. To Do)
- [x] Reject with a reason

**Notes and deviations**

- `RequestsService` lives in `core/` (next to `allocations.service`), not `features/requests/`, because the nav, the request form and triage all use it. It holds the current team's inbox as one resource, so the nav badge and the triage page always agree and both refresh after an accept or reject
- Review fix (D30, D26): "My requests" for every user (`features/requests/{my-requests, request-detail, status-pill}`, `GET /api/requests/mine`, only the user's own). Requesters land there; sending a request opens its detail page with a "Request sent." toast; the request form is about 720px wide. Request DTOs now carry the accepted task's assignee and due date. Tests: 2 API (own requests only, newest first; assignee and committed date shown to the requester) and 2 web (rows and links; empty state). Checked in Edge as David: list with New, Accepted and Rejected, send, detail for each status, and the empty state as Naledi
- Accept and reject are forms in the shared drawer (`features/triage/{accept-dialog, reject-dialog, request-summary}`), so the request stays in view while deciding. The confirmation page is `/requests/:id`
- Accept needs a project; assignee, estimate and date are optional, and the committed date starts as the requested date. The task goes at the end of the first column after Triage (D18). A request can be triaged once (a second accept or reject is a 400)
- The requested due date can't be in the past (form check and 400). The request's own requester and the team's admins can open a request; anyone else gets 403
- The badge loads when an admin opens a team and after each accept or reject; it does not poll, so a request sent from another browser shows after a page load or team switch (as in the demo script, which switches user)
- At 1440px the board's automatic collapse folded To Do, so the new task was inside a collapsed column there. Fixed 2026-10-30 (L.11): columns now collapse from Done leftwards, so at 1440 To Do, In Design and Internal Review stay open
- Checked in Edge against a separate API and web server on `juggle_check` (dropped afterwards): requester form (validation, department preset, confirmation), badge 6, newest first, accept to To Do with assignee and 16h (badge 5), reject with reason (badge 4), the requester sees Accepted, a Member has no Triage and is redirected. No console errors. 30 API tests and 62 web tests pass

**Review gate**

- [x] Build passes with no warnings, lint passes, smoke tests pass
- [x] Acceptance criteria ticked
- [x] Committed as `Phase 5: Requests and triage`
- [x] "Where we left off" and status updated to Awaiting review
- [x] **STOP** for review
- [x] Approved by user (2026-10-30, after the "My requests" and request form review fixes)

---

## Post-Phase 5 round (Fri)

**Status:** Done
**Done when:** the five items below are built, checked in the browser against the dev API with screenshots at 1440px (and 1920px for P.1, P.3 and P.4), and committed one per item on `main`

Requested by the user on 2026-10-30, after Phase 5 was approved.

**Tasks**

- [x] P.1 Board column collapse order: Done first, then right to left, so To Do stays open longest (L.11). The 240px minimum and 360px maximum were already in place
- [x] P.2 "+ Add task" on the board (D42): `NewTaskDrawer` (the task drawer's create mode, its own component because the edit drawer is built around an existing task), `POST /api/teams/{teamId}/tasks`
- [x] P.3 Side menu (D43): "Requests" nav group, collapsible icon rail with tooltips and a flyout (`layout/{nav, nav-prefs.service}`, `shared/tooltip.ts`)
- [x] P.4 Request form layout (built in the Phase 5 review, D30): checked against the spec, no code change needed
- [x] P.5 Polish: shared select audit (team dots on the request form, no `$any`), review round tooltip, single-team switcher as text

**Notes and deviations**

- Git: the `phase-5-requests-triage` and `schedule-live-drag` branches were fast-forwarded into `main` and deleted; work now happens on `main` only (`CLAUDE.md`, "Git")
- P.2 checked in Chromium against the dev API: Naledi adds to In Design for Priya (last in the column, kept after reload); the header button opens on To Do; Ethan's assignee is locked to himself, his task lands at the end of To Do and is draggable; Ethan assigning Lerato through the API gets 403. Tests: 3 API (admin, Member, refusals), 3 web (locked assignee, required fields, payload)
- P.3 needed no layout code in the board or schedule: the board re-fits its columns through its ResizeObserver as the menu's width changes, and the schedule's day columns are CSS. Checked in Chromium at 1440 and 1920: in the rail the Design board opens a fourth column at 1440 (To Do to With Requester) and widens all six at 1920; the schedule fills the width (1312px and 1792px) with no sideways page scroll; the width eases over 150ms and not at all under reduced motion; the state survives a reload; the flyout works by mouse and keyboard; a Member sees no Dashboard and no Triage. Tooltips show on hover and keyboard focus (not after a mouse click) and hide on Escape and on a page change, so the focus CDK Menu hands back to the rail icon after a choice does not leave one up. Tests: 5 web (group per role and page, badge on the closed group, rail saved and restored per user, dot)
- P.4 checked in Chromium as Naledi, opening New request from the Marketing board: the form is 720px and the panel 320px, centred together (64px each side at 1440, 304px at 1920); below 1100px (checked at 1000) the panel sits under the form at the form's width; at 560px tall the panel sticks 24px under the header while the form scrolls past; the header team switcher is hidden; Team starts as Marketing, the last team viewed. The panel wording matches the request. The Team options had no colour dots, which is fixed under P.5
- P.5 select audit: the shared select already met the spec (tokens, accent-50 active row, check on the selected option, text, avatar and dot options, search above 8 options, arrows, Enter, Escape, type-ahead, ControlValueAccessor, inside drawers) and is used for the team switcher, board filters, task and new task drawers, request form, accept form and schedule popover. Fixed: the request form's Team options had no dots, because the options API sent no team colour (now `TeamOptionDto` with `Colour`); the search box used `$any` (now its template reference). Review round badges and the drawer pill ("Review cycle" is now "Review round") show "Review round 3: sent back for changes twice" (`review-round.ts`); the tooltip widened to 320px so it fits on one line, and hides on press so a dragged card does not carry it. A user with one team (and no "All teams") sees the team as text. Checked in Chromium at 1440: tooltip, drawer pill, search and type-ahead by keyboard, Escape closing only the select inside the schedule popover, team dots, Ethan (one team, text) and Jason (two teams, dropdown). Tests: 1 API (team colours), 3 web (wording, single and two teams)

**Review gate**

- [x] Build passes with no warnings, lint passes, smoke tests pass
- [x] Screenshots at 1440px (and 1920px for P.1, P.3, P.4) reviewed and fixed
- [x] One commit per item on `main`
- [x] "Where we left off" and status updated to Awaiting review
- [x] **STOP** for review
- [x] Approved by user (2026-10-30)

---

## Phase 6 - Dashboard, roles, polish, rehearsal (Fri)

**Status:** Done
**Done when:** the full demo script runs start to finish without errors

**Files**

- API: `Features/Dashboard/{DashboardController, DashboardService, DashboardDtos}.cs`
- Tests: `DashboardTests.cs`, `AccessTests.cs`
- Web: `features/dashboard/*`, empty states across features
- Optional: `web/e2e/demo.spec.ts` (Playwright)

**Endpoints**

- `GET /api/dashboard?teamId=<id>|all` -> utilisation per person (this week, next 4 weeks, over this week), overdue tasks and New requests per team, open tasks by department (D45)

**Tasks**

- [x] 6.1 `DashboardService` and controller (D27, D45): reuses `CapacityService` for 5 weeks from this Monday and sums each person's days; `TeamScope` parses `teamId` for the schedule and dashboard
- [x] 6.2 Smoke test: `DashboardTests` (utilisation matches the schedule, counts match the board and triage, All teams, 403 for a Member and another team's admin)
- [x] 6.3 Dashboard page: summary cards linking to the filtered board, triage and schedule; utilisation per person in the schedule colours; work by department; "All teams" for Org Admins
- [x] 6.4 Role audit on the server; `AccessTests` (Member gets 403 on triage and dashboard, cannot edit others' tasks)
- [x] 6.5 Role audit in the UI: nav and route guards
- [x] 6.6 Empty states
- [x] 6.7 Visual polish at 1280 px
- [x] 6.8 Verify the seed reset command and README
- [ ] 6.9 Optional: Playwright happy path (not done: it would add `@playwright/test` to the repo; the rehearsal below ran as a local Playwright script instead)
- [x] 6.10 Rehearse the demo script (re-run after the review fixes; all steps pass):
  - [x] Sign in as a Sales requester and submit "Sales deck for Q1 roadshow"
  - [x] Switch to the Head of Design; the Dashboard opens, the triage badge and the "Requests in triage" card show the new request; open Triage from the card (changed after demo-v1)
  - [x] Schedule shows a red day, a person on leave, an under-loaded designer
  - [x] Accept the request to the under-loaded designer (16 h); it appears in To Do
  - [x] "Book on schedule" 4 h/day over 4 days; load turns green to amber
  - [x] Drag an allocation onto a full day; clash warning appears
  - [x] Drag a card to Internal Review, then Changes Requested; review cycle increases
  - [x] Dashboard shows utilisation, overdue tasks, triage queue one shorter
  - [x] Switch to Marketing: different columns and people; shared designer's load includes Design work
- [x] 6.11 Requests group icons (D43): My requests, New request and Triage get their icons back at 16px, starting where the group's label starts; the group gets a paper-airplane icon instead of Triage's inbox; the rail flyout shows the same icons
- [x] 6.12 Booking wording (D44): user-facing text says "booking" / "book"; the two API errors that reached the user ("Allocation not found.", "An allocation can be at most a year long.") now say booking; rule added to the Design section of `CLAUDE.md`

**Notes and deviations**

- 6.11 checked in Chromium at 1440 and 1920 as Naledi: each item's icon starts at x54, the same as the "Requests" label, and the label at x80; the active item (Triage, My requests, New request in the flyout) uses the top-level active style, icon included. Fixed while checking: the flyout's "REQUESTS" caption sat 2px right of the item icons. Tests: 1 web (icon per item, small, none shared with the group)
- 6.12 searched every template, inline template, aria-label, title, tooltip, toast and API error message: the web app already said Booking, New booking, Book and "6h of 8h booked"; only the two API errors (shown in toasts) said allocation. The seed has no user-facing allocation text. Tests: 1 API (both messages)
- 6.1 to 6.3 checked in Chromium at 1440 and 1920 (menu expanded and collapsed) with the demo data, against the new API build on port 5269 on the dev database (the API on 5268 was not restarted): Design shows 3 overdue, 5 in triage, 0 over capacity this week (the seed puts Lerato over next week), Ruben 90% and Amahle 85% (amber), Priya 35% (available); "All teams" shows Design 3 and Marketing 1 overdue, Design 5 and Marketing 2 in triage, and all 11 people; Marketing shows Jason's Design work in his load. The overdue card opens the board with Due set to Overdue (3 cards, all overdue), the triage card opens Triage, the schedule card the schedule; Megan (Marketing admin, one team) sees no "All teams"; Jason (Member) is sent to the board and gets 403 from the API; no page overflow, no console errors. Fixed while checking: on the filtered board at 1440 the three overdue cards sat in auto-collapsed columns while empty columns stayed open (D45 now collapses columns a filter leaves empty first); the utilisation header labels were not on one baseline; the subtitle repeated the week dates. Tests: 4 API, 7 web (team links, utilisation order and colours, board due filter, collapse with a filter, All teams on the dashboard)
- Seed (review of the dashboard, 2026-10-30): Sipho has a 3h Q1 Campaign booking on Thursday and Friday this week (10h of 8h on both days), so "Over capacity this week" shows 1. Lerato stays over from Tuesday next week for the clash step. Dates stay relative to the current week. Tests: 1 API (Sipho over this week, Lerato next week)
- Seed (Phase 6 review, 2026-10-30): Priya has a 2h/day Annual Report booking next week, so next week she is at 20h of 40h (50%, green) and the demo's 16h booking (4h/day, Monday to Thursday) takes her to 36h (90%, amber); over the 4-week view she stays under 50% (available). Step 5 shows it on the 1-week view of next week. Tests: the seeded-story test also checks Priya
- 6.4 server audit: every endpoint except demo login needs a signed-in user (fallback policy); team reads check membership, admin actions (triage, dashboard, bookings, reassign) check Team Admin, Members edit and move only their own tasks, bookings check the project's team before and after a change, a request is visible to its requester or the team's admins, and `OrgId` comes from the global query filters. No gaps found, so no code change. `AccessTests` (4): signed out gets 401; a Requester gets 403 on every team endpoint and on other people's requests; a Member gets 403 on triage, accept, reject, the dashboard, "All teams", booking and changing others' tasks, and 200 on the board and schedule; another team's admin gets 403 on Design
- 6.5 UI audit in Chromium against the dev API: David (Requester) lands on My requests, sees only the Requests group and no team switcher, is sent back from team URLs, and gets "This request could not be loaded" on someone else's request; Ethan (Member) sees no Dashboard or Triage (their URLs send him to the board), can drag only his own card, sees others' cards read-only, has Save but no "Book on schedule" and no assignee change on his own, and a read-only schedule (no editable bookings, no new booking on drag); Megan (Marketing admin) sees Marketing only. Fixed: a non-Org Admin opening `?teams=all` stayed in "All teams" and the schedule failed with the API's 403; `allTeams` now also needs an Org Admin, so they see their own team. Tests: 1 web (Member ignores `?teams=all`)
- 6.6 empty states: every page already had loading, empty and error states (board columns, schedule with no people, triage, My requests with a New request button, the dashboard panels, login, request form) except the dashboard, which showed only its header while loading (now "Loading the dashboard..."). The request detail error now says why ("It may not exist, or it was sent by someone else"). A board filter that matches nothing showed "No cards" in every column, as if the board were empty; columns now say "No matching cards" while a filter is on. Checked in Chromium (dashboard loading with a slowed API, Marketing board filtered to Overdue)
- 6.7 at 1280x800 in Chromium: login, schedule (Design and All teams), board, task drawer, dashboard, triage and the accept drawer, My requests, New request and a request detail (as Naledi and as David); no page scrolls sideways and nothing is clipped. Fixed on the dashboard: the utilisation header broke "2–27 Nov" across lines (labels and dates now wrap as whole units), and the triage card's detail wrapped to two lines (now "New requests waiting for a decision"). Rechecked at 1280, 1440 and 1920
- 6.8 ran the README's reset as written (API stopped, `dotnet run --project api/Juggle.Api -- --reset-demo`): exit 0 after 11s, and it exits without starting the server. Fresh data matches the brief: 11 people, 3 overdue (Design), 5 New requests in Design and 2 in Marketing, Sipho over capacity this week, Lerato next week. The README's run, reset, test and lint steps match the code, so it is unchanged
- 6.10 rehearsed through the UI in Chromium at 1440x900 against the dev API, on freshly reset data, with no console errors: David sends "Sales deck for Q1 roadshow" (Presentation, due in 2 weeks) and lands on its detail page; as Naledi the Requests badge shows 6 and the request tops the inbox; the 4-week schedule shows red days (Sipho this week, Lerato next week), Amahle's annual leave and Priya at 27% (available); Accept with Sales Deck, Priya, 16h (committed due date pre-filled from the request) puts the task in To Do; "Book on schedule" opens with Mon 2 Nov, 4 days, 4h/day and books it; dragging Ethan's Sales Deck booking onto Lerato's row opens "Booking clash: Lerato Mokoena is over capacity on 4 days, from Tue 3 Nov" (cancelled); "Sales deck master template" dragged to Internal Review, then to Changes Requested, ends at review round 2; the dashboard shows 3 overdue, 5 in triage (one fewer), 1 over capacity; Marketing shows Planned to Published and Chloe, Jason, Megan and Thabo, with Jason's Design bookings greyed in his load. Data reset afterwards
- 6.10 open points from the first run (resolved in the Phase 6 review: (1) Priya seed, (2) drop expands the column, (3) no change, the API is stopped before a reset): (1) Step 5 "load turns green to amber" does not happen: Priya goes from 27% to 37% on the 4-week view (still "available") and from 25% to 65% next week on the 1-week view (green). An under-loaded designer cannot reach amber from 16h alone. Options: give Priya about 2h/day more next week in the seed (next week 50% green, then 90% amber after booking, while the 4-week view still shows her as available), or change the script's wording to "her next week fills up". (2) At 1440 Changes Requested is auto-collapsed, so after step 7 the "R2" is only visible once the column is expanded (or with the menu collapsed at 1920). (3) Right after a reset with the API still running, the first API call returns 500 (its pooled connections were dropped) and the next succeeds; the README already says to stop the API first
- Board (Phase 6 review, 2026-10-30): a card dropped on a collapsed column expands that column, like a manual expand: it holds until the next resize or page load and is not saved, and the viewer's own collapsed columns are left as they were (`expandOnDrop`). Fixes demo step 7 at 1440, where the card vanished into the collapsed Changes Requested strip. Tests: 2 web (only that column opens; saved collapses unchanged, so the rules apply again on the next resize)
- Nav order (after demo-v1, 2026-10-31, D26, D43): the menu reads Dashboard (admins), Schedule, Board, then Requests with Triage (admins, with its count), My requests, New request, the same in the rail flyout. Admins now land on the Dashboard (Members on the board, requesters on My requests); switching team keeps the current page, falling back to the Dashboard for admins. Demo step 2 opens Triage from the dashboard's "Requests in triage" card. Tests: 3 web (landing per role), nav order updated
- Book on schedule (found in the 2026-10-31 rehearsal, a Saturday): the start defaulted to Tuesday on a weekend, because the next working day was counted from the following Monday. It now starts on the first working day after today (`nextWeekday`), so Monday from a Friday or the weekend (D28). Tests: 1 web
- Public holidays on the schedule (requested 2026-10-31): they showed as "Off" (a day is too narrow for a label), with the name only in a hover hint. The schedule API now marks each day load `publicHoliday`, and the grid draws each holiday once as an ink block down every row, reading "Public holiday" and its name upwards so it fits a 56px day; the hover tooltip (`appTooltip`) repeats it. A person's own leave keeps its per-row block. The sticky people column now covers the row borders, so the block does not show through them when the grid scrolls sideways. Checked in Chromium at 1440 on 1, 2, 4 and 8 weeks (Design and Marketing, scrolled sideways). Tests: 1 API (holiday flagged and named), 3 web (holidays left out of the row blocks, named once even when someone is on leave, none without people)
- Palette lift (requested 2026-10-31: "a little more vibrant, not too solid or sharp"): the accent, highlight and status tokens in `styles.css` gain saturation at about the same lightness, the page and muted fills turn slightly cooler, and project colours tint more strongly (`hue-tint` 14% to 18%, `hue-ink` 35% to 42%). The 8 data hues are unchanged. Text contrast rechecked: white on `accent-600` 5.4, every 700 on its 50 tint 4.7 or more, `hue-ink` on `hue-tint` 5.4 or more for all 8 hues. Checked the dashboard, schedule and board in Chromium at 1440
- Schedule bookings brighter (requested 2026-10-31): a `hue-booking` tint (28% of the project colour) replaces `hue-tint` (18%) on the bars; avatars keep `hue-tint`, other teams' bookings stay grey. Ink text on the new tint is 10.6:1 or more for all 8 hues. Checked the Design schedule in Chromium at 1440
- 6.10 re-run after the review fixes, through the UI at 1440x900 on freshly reset data (API stopped for the reset), with no console errors: all nine steps pass. Step 3: Priya 33% over 4 weeks (available) and 50% next week (green). Step 5: "Book on schedule" books Mon 2 to Thu 5 Nov at 4h/day; next week (1-week view) Priya goes from 50% green to 90% amber; 4 weeks 43%. Step 6: "Booking clash: Lerato Mokoena is over capacity on 4 days, from Tue 3 Nov". Step 7: Changes Requested was collapsed, opened on the drop and shows the card with R2; after a reload it is collapsed again and nothing was saved. Step 8: 3 overdue, 5 in triage, 1 over capacity. Step 9: Marketing columns and people, Jason's Design bookings greyed. Demo data reset afterwards. 6.9 (optional Playwright test in the repo) not done
- 6.10 re-run on 2026-10-31 after the nav and landing change, through the UI at 1440x900 on freshly reset data (API stopped for the reset), with no console errors: all nine steps pass. Step 2: Naledi lands on the Dashboard; the menu reads Dashboard, Schedule, Board, Requests (6), and the "Requests in triage" card shows 6 and opens Triage, where the group lists Triage 6, My requests, New request and the new request tops the inbox. Step 5: "Book on schedule" opens on Mon 2 Nov (after the weekend fix), 4 days at 4h/day; next week Priya goes from 50% green to 90% amber. Steps 3 and 6 to 9 as on 2026-10-30. Landing checked per role: Naledi and Megan on the Dashboard (switching Naledi to Marketing keeps the Dashboard), Ethan on the board, David on My requests. Demo data reset afterwards

**Acceptance criteria**

- [x] Utilisation bar per person for this week and the next 4 weeks
- [x] Cards: overdue tasks, requests waiting in triage, people over capacity this week
- [x] Work by department (task count)
- [x] Members can't see Triage or Dashboard, and can only edit their own tasks
- [x] Full demo script runs start to finish without errors

**Review gate**

- [x] Build passes with no warnings, lint passes, smoke tests pass
- [x] Acceptance criteria ticked
- [x] Committed as `Phase 6: Dashboard, roles and polish`, tagged `demo-v1`
- [x] "Where we left off" and status updated to Awaiting review
- [x] **STOP** for review
- [x] Approved by user (2026-10-30)

---

## If time runs short, cut in this order

1. Board filters
2. Resize on the schedule (keep create and move)
3. Work by department on the dashboard
4. Reject with reason (keep accept)

## Stretch (only if ahead by Thursday)

**Status:** Done (approved 2026-10-31, tagged `demo-v2`)

Built after demo-v1 (approved 2026-10-31), one commit per item.

- [x] S.1 My Work view for members (D46)
- [x] S.2 Time off request and approve flow (D47)

**Decisions**

- D46 (2026-10-31) My work (`/my-work`, outside a team, so the team switcher is hidden): for everyone with a Person record, admins included; Members land on it (D26). Nav: Dashboard (admins), My work, Schedule, Board. `GET /api/my-work` (403 without a Person) returns the person, their open tasks across all their teams (not Done, not Triage; overdue first, then by due date, undated last), their day loads and bookings for this week and next (the same `CapacityCalculator` as the schedule, so leave, holidays and other teams' bookings count), and their leave that has not ended. Sections, each full width: My tasks (To do, In progress, Review columns in the board's card style, with the team and status in place of the avatar; a card opens the board's task drawer, without reassigning or "Book on schedule", which stay on the board); My schedule (read-only: per day the schedule's availability strip, the bookings as `hue-booking` chips or the ink leave block; per week the utilisation meter, moved to `shared/`); Upcoming time off. "This week" is Monday to Friday of the current week, as on the dashboard, so on a weekend it is the week just ending
- D47 (2026-10-31) Time off requests. Anyone with a Person record asks for their own time off: type (Annual leave, Sick leave, Family responsibility, Study leave, Other), first and last day, optional note (500). Status Pending, Approved, Declined (reason required, 500) or Cancelled (by the requester, only while pending). Approvers: Team Admins of any team the person is in, and Org Admins (`TeamAccess.ManagedPeople`); admins may approve their own leave for the demo (see Later). API: `POST /api/time-off` (403 without a Person; 400 for an end before the start, more than a year, no working day, overlap with the person's own pending or approved leave, or the public holiday type), `POST /api/time-off/{id}/cancel`, `GET /api/time-off/approvals` (the pending requests the viewer can decide, earliest first), `POST /api/time-off/{id}/approve`, `POST /api/time-off/{id}/decline`; 204 for decisions, 403 for anyone else, 400 once decided. The person's own requests come with My work (pending, approved and declined with the reason; cancelled left out), so there is no separate "mine" endpoint. Schedule: approved leave is the solid ink block and takes the days off capacity; pending leave is a light hatched block (`hatch-pending`) behind the bookings, reading "Pending" and the type, in a lane of its own under them, and changes nothing (`DayLoad.pendingTimeOff`); declined and cancelled leave is not shown. Sick leave reads "Unavailable" to everyone except the person and their approvers, decided on the server (POPIA). The schedule popover's Time off tab works on the viewer's own row, for the days picked (no date fields, as for a booking); anyone, Members included, can drag across their own row's days to open it; on another row it is disabled with a tooltip, and Booking is disabled for Members. Nav: "Time off" in the Requests group after Triage, for approvers, with the pending count; the closed group counts triage and time off together. Booking clash: a booking that newly covers someone's approved leave opens the clash dialog ("on leave on ...", "Book anyway"), and `SavedAllocationDto.LeaveDays` makes "Book on schedule" warn too. Seed: Ethan's pending annual leave (Thursday and Friday in two weeks, "Family wedding in Durban"); Thabo's leave is sick leave, moved to Monday and Tuesday this week

**Notes**

- S.1 checked in Chromium at 1440 against the API on 5268 with the demo data: Jason (Member, Design and Marketing) and Amahle land on My work, Naledi on the Dashboard; the switcher is hidden; Jason's tasks come from both teams; Amahle's leave shows in the schedule strip and the time off list; the drawer opens with the assignee locked; no console errors. Fixed while checking: the schedule shared a row with time off, so day cells were about 100px and booking names truncated; each section now takes the full width (about 180px a day). Tests: 3 API (tasks across teams and their order, loads match the schedule, 403 for requesters), 5 web (grouping, weeks and bookings per day, landing, nav)
- S.2 checked in Chromium at 1440 against the API on 5268 with freshly reset demo data: Naledi's Requests group shows 6 (5 triage, 1 time off) and Time off lists Ethan's request with its note; the Design schedule shows his pending block with the tooltip "Pending approval: Annual leave · 12–13 Nov"; Jason and Chloe see Thabo's sick leave as "Unavailable", Megan and Naledi as "Sick leave". As Lerato (Member): a drag on Priya's row opens nothing; a drag on her own row opens the popover on Time off with Booking disabled; the request shows as pending on the schedule and on My work, with "Cancel request". As Naledi: approving Lerato's turns it into the ink block; declining Ethan's needs a reason, which he sees on My work, and his block goes; the group badge drops to 5; booking Amahle over her leave opens "Amahle Dlamini is on leave on Tue 3 Nov and Wed 4 Nov, and over capacity on Thu 5 Nov." No console errors. Fixed while checking: the pending label was cut to "Pending · Ann..." on a two-day block (now two lines); the taller popover ran off the top of the screen (now pushed on screen, and without date fields, which repeated the days picked); "Declined:" before the reason repeated the pill (now "Reason:"). Utilisation can rise when leave is approved, if the days off were lighter than the rest of the period; the demo script says the days come off capacity rather than that the load drops. Tests: 7 API (pending vs approved capacity, approvers per role, decline reason, cancel, validation, sick leave masking, leave days on a booking; each test picks a week with no public holiday), 6 web (pending blocks, leave days, clash and toast wording, popover tabs per role, nav)

---

## Phase C - Client demo for The Core Group

**Status:** Approved, not started (plan approved 2026-10-31; start when the user says "Start Phase C")
**Done when:** the demo data and wording mirror The Core Group's studio process (today on Monday.com), a brief can be accepted as a new job, and the rewritten demo script runs start to finish

**Context.** The Core Group's creative studio serves internal brand teams (DJI, GoPro, Bambu Lab, Pure Electric, MS Surface, Ultra Human, Reloved, CGA, ARP, InRetail, Mobile in Africa). Each brief has a job code such as `DJI0141_Q1'27_Black Friday` and many deliverables (Takealot banners, iStore, Bellyband, Cameraland video, Generic assets, A4 inserts for Incredible Connection, Cameraland, Kloppers and ODP). Their statuses: Briefed in, Working on it, Feedback needed, Awaiting approval, Done. Their brief template: date briefed in, marketing manager, studio deadline, main goal, deliverables. Pain points the demo makes visible: one designer carries far more work than the others, work stuck in "Awaiting approval", overdue deadlines, briefs arriving as free text.

**Decisions (approved 2026-10-31)**

- D48 Department label. `Organisation.DepartmentLabel` (default "Department") names the department concept in all user-facing text; the demo org sets it to "Brand". Sent with `GET /api/auth/me` and read once by `AuthService`. Used on the request form, request detail, triage ("From Zanele Mthembu, DJI"), the dashboard panel ("Work by brand", "Open tasks, by the brand each project is for") and the API's request validation message ("Choose a brand."). Lower case mid-sentence. Code, routes and DTOs keep "department" (as D35 and D44 do)
- D49 Studio workflow (replaces the Design statuses in D19). Team "Studio" replaces Design: Triage, Briefed in = Todo; Working on it = InProgress; Feedback needed, Awaiting approval = Review; Done = Done. Accepted requests land in Briefed in (D18). Moving from Feedback needed or Awaiting approval back to Working on it bumps the review round through the existing Review to InProgress rule (D20), so no code change. Marketing keeps its statuses
- D50 Request fields (replaces D11). The request follows their brief template: team, brand (the department, defaults to the user's own), job name (`Title`), main goal (`MainGoal`, the renamed `Description`, 2000), deliverables (`Deliverables`, one per line, 4000, each line up to 200 so it can become a task title), marketing manager (`MarketingManagerUserId`, required, defaults to the requester; offered from the users with a brand plus the requester), studio deadline (`RequestedDueDate`, labelled "Studio deadline"), priority. "Type of work" is dropped: the column, the `RequestType` enum and D11, since one brief mixes banners, video and print. Detail and triage show "Briefed in" (the sent date), the marketing manager, the main goal and the deliverables as a list. Accepting into an existing project makes one task whose description is the main goal and the deliverables under headings
- D51 Accept as new brief. The triage accept drawer offers "New brief" (default) or "Existing project". New brief creates a project in the request's team (Studio in the demo) for the request's brand, named with the next job code (D52), shown in an editable field before saving (required, 200). Its due date is the studio deadline and its colour the first palette hue not yet used by that brand's projects (the first hue again once all 8 are used). Each non-empty deliverables line, trimmed and without a leading bullet (`-`, `*`, `•`), becomes a task in the first column after Triage (D18), in the order given, assigned to the chosen designer, due on the committed due date (which defaults to the studio deadline), with the main goal as its description. No deliverables: one task named after the job name. The estimate stays whole on the first task, the others have none (simpler than splitting, which needs rounding, and "Book on schedule" from the first card books the whole brief, as the demo does). `Request.TaskId` points to the first task. "New brief" is disabled with a tooltip when the brand has no job code prefix. API: `GET /api/requests/{id}/new-brief` -> `{ projectName, colour }`; `POST /api/requests/{id}/accept` takes `projectId` or `newProjectName` (exactly one, 400 otherwise)
- D52 Job codes. `<PREFIX><NNNN>_Q<n>'<YY>_<job name>`. The prefix is stored on the brand (`Department.JobCodePrefix`, nullable, 10): DJI, GOPRO, BAMBU, PURE, MSS, and for the others proposed ULTRA (Ultra Human), RELOVED, CGA, ARP, INRETAIL, MIA (Mobile in Africa). The number is one more than the highest 4-digit number after the prefix in that brand's project names, from 0001. The quarter comes from the studio deadline (today when none) and the financial year start month (`Organisation.FinancialYearStartMonth`, default 3, so Q1 = March to May); the year is the last two digits of the calendar year the financial year ends in. Seeded job codes use the same rule from each project's due date, so seed and generated codes agree. **Open question:** their recording shows Black Friday as Q1'27, which fits a November start (Q1 = November to January), not March; confirm the demo org's start month at the start of the phase
- D53 Dashboard "Awaiting review" card. A fourth summary card: open tasks in Review-category statuses (Feedback needed and Awaiting approval for Studio), linking to the board; with "All teams" one line per team, as the overdue card does (D45)
- D54 Seed (replaces D31). Org "The Core Group", emails `@thecoregroup.example`. Departments are the 11 brands, with job code prefixes; team people have no brand. Teams Studio and Marketing. People keep the current made-up South African names: Naledi becomes Head of Studio (Org Admin, Studio Team Admin); Studio job titles such as Senior Designer, Digital Designer, Motion Designer, Artworker (the 5h/day part-timer) and Junior Designer; Jason stays shared with Marketing; Marketing keeps Megan (Team Admin), Thabo and Chloe. The three requesters are replaced by about 6 fictional brand marketing managers (one each for DJI, GoPro, Bambu Lab, Pure Electric, MS Surface and Ultra Human). Projects are briefs with job codes across about 8 brands, about 10 in Studio (for example `DJI0141_..._Black Friday`, `DJI0142_..._Amazon Brand Store`, GoPro, Bambu Lab, Pure Electric, MS Surface) and 4 in Marketing, coloured from the palette. About 40 tasks are deliverables (Black Friday has the deliverables listed above); about 6 in Awaiting approval, 3 or 4 overdue, some on round 2 or 3. Load: Lerato heavily overloaded this week and next with several red days, and the only person over this week; Priya under-loaded at 50% next week, so the demo's 16h booking takes her to amber; everyone else at 60 to 90%, with a day at exactly 8h left for the clash step; two Studio people on approved leave; Ethan's pending leave and Thabo's masked sick leave stay. Triage: 5 New briefs in Studio and 2 in Marketing written like their template (main goal, deliverables, marketing manager), plus 3 accepted. No brand logos anywhere: brands are names and palette colours only

**Files**

- API data: `Data/Entities/{Organisation, Department, Request}.cs`, `Data/Entities/Enums.cs` (drop `RequestType`), `Data/JuggleDbContext.cs`, one migration, `Data/Seed/DemoSeeder.cs`
- API features: `Features/Auth/{AuthDtos, AuthService}.cs` (label), `Features/Requests/{RequestDtos, RequestService, RequestsController}.cs`, `Features/Requests/JobCodes.cs` (next code, quarter, colour), `Features/Dashboard/{DashboardDtos, DashboardService}.cs`
- Tests: `AuthTests`, `RequestsTests` (new fields, new brief), `DashboardTests`, and the seed-dependent tests (`CapacityTests`, `TasksTests`, `MyWorkTests`, `TimeOffTests`, `AccessTests`, `AllocationsTests`)
- Web: `core/{models, auth.service}.ts`, `features/requests/{request-form, request-detail, my-requests, request-guide}`, `features/triage/{triage-page, request-summary}` and the accept drawer, `features/dashboard/{dashboard-page, department-panel}` and the summary cards, specs
- Docs: `docs/demo-brief.md` (seed table, org name, demo script), this plan (D11, D19, D31 marked replaced)

**Endpoints**

- `GET /api/auth/me` adds `departmentLabel`
- `GET /api/requests/options` drops types, adds marketing managers
- `POST /api/requests` takes `mainGoal`, `deliverables`, `marketingManagerUserId`; no `type`
- `GET /api/requests/{id}/new-brief` -> `{ projectName, colour }` (team admins; 400 when the brand has no prefix)
- `POST /api/requests/{id}/accept` takes `projectId` or `newProjectName`
- `GET /api/dashboard` adds `awaitingReview` per team

**Tasks**

- [ ] C.1 Confirm the financial year start month for the demo org (D52)
- [ ] C.2 Migration: `Organisation.DepartmentLabel` and `FinancialYearStartMonth`, `Department.JobCodePrefix`, `Request.Description` renamed to `MainGoal`, `Request.Deliverables` and `MarketingManagerUserId` added, `Request.Type` dropped
- [ ] C.3 Department label through `/api/auth/me` and `AuthService`; every "department" in user-facing text uses it (D48)
- [ ] C.4 Request API and form: new fields, "Type of work" removed, labels from their template, detail, My requests and triage show them (D50)
- [ ] C.5 Job codes: next number, quarter and year, unused colour (D52), with unit tests for the quarter at year and financial-year boundaries
- [ ] C.6 Accept as new brief: API (new-brief suggestion, accept with a new project, one task per deliverable) and the accept drawer's "New brief" / "Existing project" choice with the editable code (D51)
- [ ] C.7 Dashboard "Awaiting review" card (D53)
- [ ] C.8 Seed rewrite (D54); `--reset-demo`
- [ ] C.9 Tests updated for the new seed; new tests for the label, the request fields, new brief and the dashboard card
- [ ] C.10 `docs/demo-brief.md`: seed table, org name and the demo script below
- [ ] C.11 Build with no warnings, lint, all tests; restart the API and `ng serve`; run the demo script in a browser at 1440; screenshots of the dashboard, schedule, board and request form for the user

**Demo script (to write into `docs/demo-brief.md` in C.10)**

1. **Dashboard as the Head of Studio:** Lerato is over capacity this week and tops utilisation; the "Awaiting review" card shows the approval backlog; overdue deliverables are counted
2. **Schedule:** Lerato's red days this week and next; Priya clearly available; the person on leave
3. **A DJI marketing manager submits a brief:** job name, main goal, three deliverables, studio deadline in two weeks. No more free-text briefs
4. **Accept as a new brief:** in Triage, "New brief" proposes `DJI0143_Q<n>'<YY>_<job name>` (editable); assign Priya, 16h, committed date. A new DJI project appears with the next unused colour and three cards in Briefed in
5. **Book it:** from the first card, "Book on schedule" for 4h/day over 4 days; Priya goes from green to amber
6. **Clash:** drag a booking onto a full day; the clash dialog appears
7. **Review round:** drag a card from Awaiting approval back to Working on it; it shows R2
8. **Time off:** as a designer, request Monday and Tuesday of the week after next; approve it as the Head of Studio
9. **Switch team to Marketing:** different columns and people; Jason's load includes Studio work
10. **Close:** "One place for every brand: who is busy, who is free and what is waiting." Then the discovery questions

Ask Juggle is not built (the AI assistant is out of scope), so the script has no Ask Juggle step.

**Acceptance criteria**

- [ ] Users see "Brand" wherever the department concept appears; code names are unchanged
- [ ] The Studio board has Briefed in, Working on it, Feedback needed, Awaiting approval and Done; sending a card back from either review column bumps the round
- [ ] Projects are briefs with job codes across several brands, coloured from the palette; tasks are deliverables
- [ ] Only fictional people; one designer clearly overloaded this week and next, one clearly under-loaded, the rest normal
- [ ] Several deliverables in Awaiting approval and a few overdue; the dashboard shows the backlog
- [ ] The request form follows their template, with no "Type of work"
- [ ] A brief accepted as new creates the job-coded project and one task per deliverable for the chosen designer
- [ ] Clash, green to amber, pending leave and sick leave masking still work
- [ ] No brand logos anywhere
- [ ] The demo script runs start to finish

**Review gate**

- [ ] Build passes with no warnings, lint passes, smoke tests pass
- [ ] Acceptance criteria ticked
- [ ] Committed as `Phase C: Client demo for The Core Group`
- [ ] "Where we left off" and the phase status updated to Awaiting review
- [ ] **STOP** for review, with the screenshots
- [ ] Approved by user

## Later

**Future development:** Ideas captured during the demo build. Prioritise with the Head of Design after the demo; do not build without approval.

- Booking clash, "Add to waiting list": a third choice in the clash dialog that parks the booking, plus a waiting list panel of unscheduled bookings, so work that does not fit is kept rather than forced in or lost
- Booking clash, "Extend availability": a third choice that raises the person's capacity on the clashing days, so agreed extra hours show as capacity rather than overload; needs per-day capacity overrides in the data model
- Overtime flag on allocations: bookings saved with "Book with overtime" are marked, shown as a marker on the bar and counted separately in reports, so overtime is visible instead of looking like a planning mistake
- Project and team colour picker limited to the 8 palette hues, so colours set in the app always fit the design
- Schedule filters by project, skill or department, so a lead can find who is free for a kind of work
- Hover on a booking shows the linked task and its due date, so the schedule explains why someone is booked
- Team workflow settings screen to add, rename, reorder and delete board columns, so teams can shape their own flow without a developer
- Move the remaining `title` hints (schedule day cells, bookings, time off, utilisation, avatars, card due dates, column counts) to `appTooltip`, so every tooltip matches the design and none is clipped
- Split booking: hovering a booking shows a "Split" action at the day boundary under the pointer, and clicking splits it into two bookings there, so a booking can be broken up without deleting and re-creating it
- Duplicate booking: copy a booking to another person or other dates, so repeated work is quick to plan
- Total hours bookings: enter the total hours and the dates, and hours/day is worked out, since work is often estimated as a total rather than per day
- Tentative bookings: pencilled-in bookings shown in a lighter style and left out of (or flagged in) utilisation, so likely work can be planned before it is confirmed
- Settings screens (statuses, request types, teams)
- **Members reassigning tasks becomes a setting** (requested by the product owner, 2026-10-27)
  - Today (D36): only Team Admins and Org Admins can change a task's assignee; Members cannot, even on their own tasks
  - After the MVP: Team Admins and Org Admins can switch this on or off, so each team chooses whether its Members may reassign their own tasks
  - Where: a settings page that works per department (team), which could also hold the other settings above
  - Code to change: the assignee check in `TasksService.UpdateAsync` (API) and the `canReassign` input of the task drawer (web)
- Admins' own leave is approved by someone else (requested 2026-10-31): in the MVP an admin's own time off goes to another admin of their team or an Org Admin, not self-approved (the demo lets admins approve their own, D47)
- Time off on someone's behalf (requested 2026-10-31): admins enter time off for a person, such as sick leave phoned in, without the person asking for it in the app
- Comments, audit log, notifications, email
- Board column preferences stored per user in the database, so they follow the user across devices (today they are in localStorage, per browser)
- SSO (Entra ID, Google) behind `IDemoAuth`
- Azure deployment
- Multiple assignees per task
- Integrations, AI assistant, CSV export, mobile layout

## Progress log

- 2026-10-26: Read the brief, created `CLAUDE.md` and this plan. Decisions D1-D34 approved; Phase 0 committed. Starting Phase 1.
- 2026-10-26: Phase 1 built and verified (API smoke tests, web unit test, headless-browser walkthrough of login, team switcher and role landing pages). Committed; awaiting review.
- 2026-10-27: Phase 1 approved. Schedule rename (D35) and team dropdown fix. Phase 2 built and verified (10 API tests, 10 web unit tests, headless-browser walkthrough of columns, cards, drag between and within columns, filtered drag, filters, drawer edit, Marketing board, Member restrictions). Committed; awaiting review.
- 2026-10-27: Phase 2 review fixes (D36 admin-only reassign, disabled field styling, toast position); reassign setting recorded under Later. Phase 2 approved. Phase 3 built and verified (18 API tests, 19 web unit tests, headless-browser walkthrough of 1/2/4 weeks, paging, load colours, leave and holidays, greyed cross-team bars, All teams, Marketing, Member view). Committed; awaiting review.
- 2026-10-27: Phase 3 review fix (team name in allocation tooltips). Phase 3 approved; Phase 4 on hold until the user says to start.
- 2026-10-27: Design pass built (tokens, fonts, shell, Board, Schedule with utilisation and over-capacity tint, drawer, toasts, login; seed colours on the palette; D37). Build, lint, 18 API tests and 21 web tests pass; screenshots at 1440px reviewed and fixed (today line placement, active nav, bar edge, name column width). Awaiting review.
- 2026-10-27: Design pass approved and committed. Starting the schedule layout rework (resource-planner pattern).
- 2026-10-27: Schedule layout built (resource-planner pattern, D38): API accepts 8 weeks and sends the project department; realistic seed bookings. Build, lint, 18 API tests and 26 web tests pass; screenshots at 1440px reviewed and fixed (nested repeat() dropped the grid columns, illegible one-day holidays, week labels under the people header, truncated leave labels). Awaiting review.
- 2026-10-27: Schedule and Board made responsive (L.10). 8-week failure traced to a stale dev API process (400 from the old weeks validation). Screenshots at 1280, 1440 and 1920px checked: no page overflow, schedule fills the width, board columns equal and full height. Awaiting review.
- 2026-10-27: Board tweaks (L.11): 240px minimum, edge fade, collapsible columns remembered per team (Done starts collapsed). Build, lint and 28 web tests pass; checked at 1440px (fade at start, middle and end of scroll; drop on a collapsed strip; collapse kept after reload). Awaiting review.
- 2026-10-27: Board column collapse is now automatic: the last Done-category column collapses only when the columns do not fit at 240px, recalculated on resize; manual choices override it and are remembered per team. Build, lint and 33 web tests pass; checked Design at 1920 (all expanded), 1440 and 1280 (Done collapsed), plus reload and resize with manual overrides. Awaiting review.
- 2026-10-28: Board automatic collapse now applies to any column: while the columns do not fit at 240px they collapse one at a time, Done-category columns first, then from the edges inward, keeping at least one expanded. Build, lint and 40 web tests pass. Awaiting review.
- 2026-10-28: Board collapse rules revised: manual collapses remembered per user (not per team), manual expands not remembered, clicks hold until the next resize or page load, old keys cleared. Fixed while testing: expanding a column at 1280 collapsed another one instead of letting the board scroll. Build, lint and 44 web tests pass; checked in Chromium at 1920, 1440 and 1280 with live resizes, and with Ethan and Lerato on the same browser. Approved and committed (285e835).
- 2026-10-28: Phase 4 built: allocations API (create, update, delete, clash days, permissions by the project's team), drag to create, move and resize on the schedule, edit popover with delete, clash warning toasts, "Book on schedule" in the task drawer, read-only grid for Members (D39). Board and Schedule lazy-loaded to stay inside the bundle budget. Build with no warnings, lint, 24 API tests and 57 web tests pass; checked end to end in Chromium. Awaiting review.
- 2026-10-30: Phase 4 review fix, fluid schedule drags (D40): immediate lift on press, 3px click threshold, the booking follows the pointer pixel by pixel with a snapped drop outline and target row tint, smooth resize and create, Esc cancels. Build, lint and 60 web tests pass; checked mid-move, mid-resize, mid-shrink and mid-create in Edge. Awaiting review.
- 2026-10-30: Live schedule drag (D41): the dragged booking is the preview, snapping per day with a 120ms ease; strips, utilisation and stacking update live from client-side loads; rows animate height; "Booking clash" dialog replaces the clash toast; create popover gains "Booking" and a disabled "Time off" tab. Future development ideas added to "Later". Build, lint and 62 web tests pass; recorded in Edge. Phase 4 approved and committed; Phase 5 started.
- 2026-10-30: Phase 5 built: requests API (options, create, get, team inbox, accept into the first column after Triage, reject with reason; requester or team admin access), request form and confirmation page, triage inbox newest first with a nav badge, accept and reject in the drawer. Build with no warnings, lint, 30 API tests and 62 web tests pass; checked end to end in Edge. Awaiting review.
- 2026-10-30: Phase 5 review fix: "My requests" page and request detail (D30), requesters land there (D26), request form 720px wide. Build, lint, 31 API tests and 64 web tests pass; checked in Edge as David. Awaiting review.
- 2026-10-30: Request form review fix: centred two-column layout (form about 720px, sticky "What happens next" and tips panel, stacked under 1100px), header team switcher hidden on request pages, team pre-filled from the last team viewed. Phase 5 approved and committed. Phase 6 on hold until the user says to start.
- 2026-10-30: Drop outline fixed: one booking tall in the lane it will take, full length, split as the real layout, no ghost fill. Build, lint and 58 web tests pass; outline matched the landed booking for move, resize start and end, and create. Awaiting review.
- 2026-10-27: Availability strip segments are now fill bars (L.12), so a fully booked day reads as full, not empty. Build, lint and 34 web tests pass; every segment fill checked against its tooltip in the running app. Awaiting review.
- 2026-10-27: Shared select (L.13) on CDK Overlay + Listbox replaces all native selects. Build, lint and 38 web tests pass; checked in the running app: team switcher, assignee filter (search + Enter), drawer assignee (keyboard open, arrows, type-ahead, Escape and outside click close only the panel). Awaiting review.
- 2026-10-27: Schedule layout block (L.1 to L.13) approved and committed. Phase 4 on hold until the user says to start.
- 2026-10-30: Post-Phase 5 round, item 1: board columns auto-collapse Done first, then right to left (240px minimum and 360px maximum unchanged; manual rules unchanged). Branches merged into `main` (fast-forward) and deleted; Git rule added to `CLAUDE.md`. Build, lint and 66 web tests pass; checked against the dev API: Design at 1440 keeps To Do, In Design and Internal Review open, Marketing folds only Published, everything open at 1920.
- 2026-10-30: Post-Phase 5 round, item 2 (D42): "Add task" on the board (each column and the header) opens the new task drawer; `POST /api/teams/{teamId}/tasks` with Members limited to themselves. Build with no warnings, lint, 34 API tests and 69 web tests pass; checked in Chromium as Naledi and Ethan.
- 2026-10-30: Post-Phase 5 round, item 3 (D43): side menu with a "Requests" group and a collapsible icon rail (tooltips, dots, flyout, remembered per user, eased width). Build with no warnings, lint and 74 web tests pass; checked in Chromium at 1440 and 1920 (board and schedule re-fit, reduced motion, keyboard flyout, Member view).
- 2026-10-30: Post-Phase 5 round, item 4: request form layout checked against the spec at 1000, 1440 and 1920 (and 560px tall for the sticky panel); it was already built in the Phase 5 review (D30), so only the plan changed.
- 2026-10-30: Post-Phase 5 round, item 5: select audit (team colour dots on the request form, `$any` removed), review round tooltips, single-team switcher as text. Build with no warnings, lint, 35 API tests and 77 web tests pass; checked in Chromium at 1440. Demo data reset with `--reset-demo`. Round awaiting review.
- 2026-10-30: Post-Phase 5 round approved. Phase 6 started. Item 6.11: Requests group icons (16px item icons aligned under the group label, paper-airplane for the group, same icons in the rail flyout). Build with no warnings, lint and 78 web tests pass; checked in Chromium at 1440 and 1920, menu expanded and collapsed.
- 2026-10-30: Item 6.12 (D44): "booking" in all user-facing text; two API error messages fixed, rule in `CLAUDE.md`. Build with no warnings and 36 API tests pass.
- 2026-10-30: Phase 6 dashboard (6.1 to 6.3, D45): `GET /api/dashboard` reusing the schedule rules, dashboard page with summary cards, utilisation and work by department, "All teams" for Org Admins, board "Due" filter, filtered board keeps matching columns open. Build with no warnings, lint, 40 API tests and 87 web tests pass; checked in Chromium at 1440 and 1920 against the new API build on the dev database. Awaiting review.
- 2026-10-30: Demo data reset with `--reset-demo` after the dashboard (week of 26 Oct), and again after the seed change (Sipho over capacity this week). The API on 5268 restarted on the new build; it serves `/api/dashboard`, and the Design dashboard shows Sipho over this week (35h of 40h).
- 2026-10-30: Phase 6 continued: seed puts Sipho over capacity this week; 6.4 server role audit (no gaps, `AccessTests`); 6.5 UI role audit ("All teams" only for Org Admins); 6.6 empty states; 6.7 polish at 1280; 6.8 reset and README verified; 6.10 demo rehearsed end to end through the UI with one open point (step 5 does not turn green to amber). Build with no warnings, lint, 45 API tests and 88 web tests pass. Demo data reset. Awaiting review.
- 2026-10-30: Phase 6 review fixes: Priya at 50% next week in the seed (step 5 goes green to amber), a card dropped on a collapsed column expands it (not saved). Demo script re-run end to end with all steps passing. Build with no warnings, lint, 45 API tests and 90 web tests pass. Demo data reset. Phase 6 approved and done; tagged `demo-v1`.
- 2026-10-31: After demo-v1: nav order (Dashboard, Schedule, Board; Triage first in Requests) and admins land on the Dashboard (D26, D43); schedule reference image removed from the repo; "Book on schedule" starts on Monday when booking at the weekend. Demo script re-run end to end with all steps passing. Build with no warnings, lint, 45 API tests and 94 web tests pass. Demo data reset. Phase 6 done; `demo-v1` moved to the new Phase 6 commit.
- 2026-10-31: Public holidays on the schedule read "Public holiday" and the holiday's name, as one block down every row, instead of "Off". Build with no warnings, lint, 46 API tests and 97 web tests pass.
- 2026-10-31: Palette lifted a little (more saturated accent, status and project tints, still soft); contrast rechecked for AA. Build with no warnings, lint and 97 web tests pass.
- 2026-10-31: Schedule bookings use a brighter project tint (`hue-booking`). Build with no warnings, lint and 97 web tests pass.
- 2026-10-31: Stretch approved (with decisions on declined requests, self-approval and leave on behalf). S.1 My work built and checked at 1440. Build with no warnings, lint, 49 API tests and 102 web tests pass.
- 2026-10-31: S.2 Time off request and approval built (D47) and checked at 1440 through the UI. Build with no warnings, lint, 56 API tests and 108 web tests pass. Demo data reset. Stretch awaiting review.
- 2026-10-31: Review of the stretch: My tasks columns show three cards (384px, the top of a fourth showing) and scroll inside the column (thin scrollbar, and `scroll-fade-y`, the vertical twin of the board's edge fade, on an edge with more to show) instead of growing; task cards drop their 1px border and rely on the soft shadow, on the board too, as the card is shared. Checked at 1440 and 2000. Build with no warnings, lint and 108 web tests pass.
- 2026-10-31: Stretch approved and done; `demo-v2` tagged on its last commit (1b35be2). Phase C (client demo for The Core Group) planned and approved (D48 to D54); not started.
