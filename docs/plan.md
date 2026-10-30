# Juggle Demo Plan

Build plan for the demo in `docs/demo-brief.md`. Demo due Fri 2026-10-30.

## Where we left off

| | |
| --- | --- |
| Current phase | 5 - Requests + triage |
| Phase status | Awaiting review |
| Last completed task | Phase 5 tasks 5.1 to 5.8, committed as `Phase 5: Requests and triage` |
| Next task | 6.1, once the user approves Phase 5 |
| Blockers / open questions | Waiting for the Phase 5 review |
| Last updated | 2026-10-30 |

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
| 5 | Thu pm | Requests + triage | Awaiting review |
| 6 | Fri | Dashboard, roles, polish, rehearsal | Not started |

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
- D17 Time off is full days only. Only `Approved` time off reduces capacity; the seed has only approved leave
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
- D26 Landing pages: admins go to the schedule, Members to the board, Requesters to the request form
- D27 Dashboard: per person, one bar for this week and one for the next 4 weeks combined. "Over capacity this week" = at least one red day this week. "Work by department" counts open (not Done) tasks of the current team, grouped by the project's department
- D28 "Book on schedule" opens a small form: start date (default next working day), number of working days, hours/day (default estimate / days). It creates an allocation linked to the task
- D29 Add allocation delete (button in the bar's edit popover), so a wrong drag during the demo can be undone. Small addition beyond the brief
- D30 The request confirmation page shows the request's title and status (New). No "My requests" list (in Later)
- D34 Moving a bar can change its dates and its person (drop on another row in the same team)
- D35 The capacity grid page is called "Schedule" in all UI text. Routes (`/t/:teamId/capacity`), the API (`/api/capacity`) and code names keep "capacity"
- D36 Only Team Admins (and Org Admins) change a task's assignee. Members edit every other field of their own tasks. Assigning work is a capacity decision for the lead, and a Member who reassigns a task would lose access to it. **Demo default only:** after the MVP this becomes a setting Team Admins and Org Admins can change (see "Members reassigning tasks" under Later)
- D37 (2026-10-27, design pass) Schedule cells show no hours free. Load colour (D15) is shown on each person's utilisation for the days shown (D14), and a day over capacity is tinted red with the hours over ("+2h")
- D41 (2026-10-30, Phase 4 review) The schedule reacts live while dragging, as Resource Guru does. The dragged booking is its own preview: the grid shows the bookings as the drop would leave them, snapped to whole days, and recomputes every day's booked hours from them in the client (the same rule as the API), so stacking, availability strips, utilisation and "Overbooked" update live with no API calls until the drop. Each snap eases over 120ms (FLIP with the Web Animations API) and row height over 150ms (every row has the same number of lane tracks, unused ones 0 high, so `grid-template-rows` can interpolate); both are off under `prefers-reduced-motion`. A drop or popover save that puts someone over capacity opens a "Booking clash" dialog (Cancel puts it back; "Book with overtime" saves) in place of the warning toast. Drag on empty days opens the popover with "Booking" and "Time off" tabs; "Time off" is disabled because the API cannot create time off
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
**Done when:** the schedule reads at a glance like a resource planner (`docs/schedule-reference.png` for structure only); screenshots at 1440px reviewed

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
- [x] L.11 Board tweaks (2026-10-27): column minimum 240px; soft fade on an edge with more to scroll to (CSS scroll-driven mask); collapsible columns (narrow strip with name and card count, still a drop target). Automatic collapse: all columns expanded when they fit at their minimum width; otherwise columns collapse one at a time until they fit (Done-category columns first, last first, then from the edges inward; one always stays expanded); recalculated as the board area resizes. Collapse rules (2026-10-28): a manual collapse holds at any width and is remembered per user (`juggle.board.collapsed.<userId>`, a list of column ids); a manual expand is not remembered; after any click the columns stay as the user left them (the board scrolls) until the next resize or page load, then the automatic rules apply again; widening re-expands only automatically collapsed columns. The old `juggle.board.columns.*` keys are cleared on load
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

**Status:** Awaiting review
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
- Accept and reject are forms in the shared drawer (`features/triage/{accept-dialog, reject-dialog, request-summary}`), so the request stays in view while deciding. The confirmation page is `/requests/:id`
- Accept needs a project; assignee, estimate and date are optional, and the committed date starts as the requested date. The task goes at the end of the first column after Triage (D18). A request can be triaged once (a second accept or reject is a 400)
- The requested due date can't be in the past (form check and 400). The request's own requester and the team's admins can open a request; anyone else gets 403
- The badge loads when an admin opens a team and after each accept or reject; it does not poll, so a request sent from another browser shows after a page load or team switch (as in the demo script, which switches user)
- At 1440px the board's automatic collapse folds To Do, so the new task is inside a collapsed column there; at 1920 every column is open. Worth checking the demo screen width before Friday
- Checked in Edge against a separate API and web server on `juggle_check` (dropped afterwards): requester form (validation, department preset, confirmation), badge 6, newest first, accept to To Do with assignee and 16h (badge 5), reject with reason (badge 4), the requester sees Accepted, a Member has no Triage and is redirected. No console errors. 30 API tests and 62 web tests pass

**Review gate**

- [x] Build passes with no warnings, lint passes, smoke tests pass
- [x] Acceptance criteria ticked
- [x] Committed as `Phase 5: Requests and triage`
- [x] "Where we left off" and status updated to Awaiting review
- [x] **STOP** for review
- [ ] Approved by user

---

## Phase 6 - Dashboard, roles, polish, rehearsal (Fri)

**Status:** Not started
**Done when:** the full demo script runs start to finish without errors

**Files**

- API: `Features/Dashboard/{DashboardController, DashboardService, DashboardDtos}.cs`
- Tests: `DashboardTests.cs`, `AccessTests.cs`
- Web: `features/dashboard/*`, empty states across features
- Optional: `web/e2e/demo.spec.ts` (Playwright)

**Endpoints**

- `GET /api/teams/{teamId}/dashboard` -> utilisation per person, overdue tasks, triage count, people over capacity, work by department

**Tasks**

- [ ] 6.1 `DashboardService` and controller (D27)
- [ ] 6.2 Smoke test: `DashboardTests`
- [ ] 6.3 Dashboard page: utilisation bars, summary cards, work by department
- [ ] 6.4 Role audit on the server; `AccessTests` (Member gets 403 on triage and dashboard, cannot edit others' tasks)
- [ ] 6.5 Role audit in the UI: nav and route guards
- [ ] 6.6 Empty states
- [ ] 6.7 Visual polish at 1280 px
- [ ] 6.8 Verify the seed reset command and README
- [ ] 6.9 Optional: Playwright happy path
- [ ] 6.10 Rehearse the demo script:
  - [ ] Sign in as a Sales requester and submit "Sales deck for Q1 roadshow"
  - [ ] Switch to the Head of Design; triage badge shows the new request
  - [ ] Schedule shows a red day, a person on leave, an under-loaded designer
  - [ ] Accept the request to the under-loaded designer (16 h); it appears in To Do
  - [ ] "Book on schedule" 4 h/day over 4 days; load turns green to amber
  - [ ] Drag an allocation onto a full day; clash warning appears
  - [ ] Drag a card to Internal Review, then Changes Requested; review cycle increases
  - [ ] Dashboard shows utilisation, overdue tasks, triage queue one shorter
  - [ ] Switch to Marketing: different columns and people; shared designer's load includes Design work

**Acceptance criteria**

- [ ] Utilisation bar per person for this week and the next 4 weeks
- [ ] Cards: overdue tasks, requests waiting in triage, people over capacity this week
- [ ] Work by department (task count)
- [ ] Members can't see Triage or Dashboard, and can only edit their own tasks
- [ ] Full demo script runs start to finish without errors

**Review gate**

- [ ] Build passes with no warnings, lint passes, smoke tests pass
- [ ] Acceptance criteria ticked
- [ ] Committed as `Phase 6: Dashboard, roles and polish`
- [ ] "Where we left off" and status updated to Awaiting review
- [ ] **STOP** for review
- [ ] Approved by user

---

## If time runs short, cut in this order

1. Board filters
2. Resize on the schedule (keep create and move)
3. Work by department on the dashboard
4. Reject with reason (keep accept)

## Stretch (only if ahead by Thursday)

- [ ] My Work view for members
- [ ] Time off request and approve flow

## Later

**Future development:** Ideas captured during the demo build. Prioritise with the Head of Design after the demo; do not build without approval.

- Booking clash, "Add to waiting list": a third choice in the clash dialog that parks the booking, plus a waiting list panel of unscheduled bookings, so work that does not fit is kept rather than forced in or lost
- Booking clash, "Extend availability": a third choice that raises the person's capacity on the clashing days, so agreed extra hours show as capacity rather than overload; needs per-day capacity overrides in the data model
- Overtime flag on allocations: bookings saved with "Book with overtime" are marked, shown as a marker on the bar and counted separately in reports, so overtime is visible instead of looking like a planning mistake
- Time off from the schedule popover: the "Time off" tab (type and dates) is in place but disabled, because the API has no endpoint for creating time off yet
- Project and team colour picker limited to the 8 palette hues, so colours set in the app always fit the design
- Schedule filters by project, skill or department, so a lead can find who is free for a kind of work
- Hover on a booking shows the linked task and its due date, so the schedule explains why someone is booked
- Team workflow settings screen to add, rename, reorder and delete board columns, so teams can shape their own flow without a developer
- Single-team users see the team name as text instead of a dropdown, since a one-item switcher is noise
- Tooltip on review round badges (for example "Review round 2: sent back once"), so the badge explains itself
- Split booking: hovering a booking shows a "Split" action at the day boundary under the pointer, and clicking splits it into two bookings there, so a booking can be broken up without deleting and re-creating it
- Duplicate booking: copy a booking to another person or other dates, so repeated work is quick to plan
- Total hours bookings: enter the total hours and the dates, and hours/day is worked out, since work is often estimated as a total rather than per day
- Tentative bookings: pencilled-in bookings shown in a lighter style and left out of (or flagged in) utilisation, so likely work can be planned before it is confirmed
- "My requests" list for requesters
- Settings screens (statuses, request types, teams)
- **Members reassigning tasks becomes a setting** (requested by the product owner, 2026-10-27)
  - Today (D36): only Team Admins and Org Admins can change a task's assignee; Members cannot, even on their own tasks
  - After the MVP: Team Admins and Org Admins can switch this on or off, so each team chooses whether its Members may reassign their own tasks
  - Where: a settings page that works per department (team), which could also hold the other settings above
  - Code to change: the assignee check in `TasksService.UpdateAsync` (API) and the `canReassign` input of the task drawer (web)
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
- 2026-10-30: Drop outline fixed: one booking tall in the lane it will take, full length, split as the real layout, no ghost fill. Build, lint and 58 web tests pass; outline matched the landed booking for move, resize start and end, and create. Awaiting review.
- 2026-10-27: Availability strip segments are now fill bars (L.12), so a fully booked day reads as full, not empty. Build, lint and 34 web tests pass; every segment fill checked against its tooltip in the running app. Awaiting review.
- 2026-10-27: Shared select (L.13) on CDK Overlay + Listbox replaces all native selects. Build, lint and 38 web tests pass; checked in the running app: team switcher, assignee filter (search + Enter), drawer assignee (keyboard open, arrows, type-ahead, Escape and outside click close only the panel). Awaiting review.
- 2026-10-27: Schedule layout block (L.1 to L.13) approved and committed. Phase 4 on hold until the user says to start.
