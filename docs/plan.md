# Juggle Demo Plan

Build plan for the demo in `docs/demo-brief.md`. Demo due Fri 2026-10-30.

## Where we left off

| | |
| --- | --- |
| Current phase | Phase 3 - Schedule, read |
| Phase status | Awaiting review |
| Last completed task | 3.11 "All teams"; Phase 3 committed |
| Next task | User review of Phase 3, then 4.1 `AllocationService` |
| Blockers / open questions | Phase 3 review (see "Notes and deviations" in Phase 3) |
| Last updated | 2026-10-27 |

## Phase overview

| Phase | Day | Milestone | Status |
| --- | --- | --- | --- |
| 0 | Mon | Plan approved | Done |
| 1 | Mon | Scaffold + demo login | Done |
| 2 | Tue | Board | Done |
| 3 | Wed | Schedule (read) | Awaiting review |
| 4 | Thu am | Schedule interactions | Not started |
| 5 | Thu pm | Requests + triage | Not started |
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

**Status:** Awaiting review
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
- [ ] Approved by user

---

## Phase 4 - Schedule interactions (Thu am)

**Status:** Not started
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

- [ ] 4.1 `AllocationService`: create, update, delete; input validation; permission by the project's team; clash days (D16)
- [ ] 4.2 `AllocationsController`; smoke test `AllocationsTests`
- [ ] 4.3 Drag across empty cells to pick a date range (pointer events), then popover: project, hours/day
- [ ] 4.4 Move a bar with CDK drag, snapped to cells (dates and person, D34)
- [ ] 4.5 Resize a bar by its edge
- [ ] 4.6 Click a bar: edit popover (hours/day, notes, delete)
- [ ] 4.7 Clash warning toast
- [ ] 4.8 "Book on schedule" dialog in the task drawer (D28)
- [ ] 4.9 Grid read-only for Members

**Acceptance criteria**

- [ ] Drag on empty cells to create an allocation (pick project, hours/day); drag a bar to move it; drag its edge to resize
- [ ] Saving an allocation that pushes a day over capacity shows a clash warning, but still allows it
- [ ] Task drawer: "Book on schedule" creates an allocation for the assignee

**Review gate**

- [ ] Build passes with no warnings, lint passes, smoke tests pass
- [ ] Acceptance criteria ticked
- [ ] Committed as `Phase 4: Schedule interactions`
- [ ] "Where we left off" and status updated to Awaiting review
- [ ] **STOP** for review
- [ ] Approved by user

---

## Phase 5 - Requests + triage (Thu pm)

**Status:** Not started
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

- [ ] 5.1 `RequestService` and controller: options, create, get, list, accept (task in the status after Triage, D18), reject
- [ ] 5.2 Smoke test: `RequestsTests`
- [ ] 5.3 Request form page
- [ ] 5.4 Confirmation page with status
- [ ] 5.5 Triage inbox, newest first
- [ ] 5.6 Nav count badge, refreshed after accept or reject
- [ ] 5.7 Accept dialog
- [ ] 5.8 Reject dialog with reason

**Acceptance criteria**

- [ ] Any user can submit: team, type, title, description, department, requested due date, priority
- [ ] On submit, show a confirmation and the request's status
- [ ] Lists New requests for the current team, newest first, with a count badge in the nav
- [ ] Accept: choose project, assignee, estimate, committed due date; creates a task in the first column after Triage (e.g. To Do)
- [ ] Reject with a reason

**Review gate**

- [ ] Build passes with no warnings, lint passes, smoke tests pass
- [ ] Acceptance criteria ticked
- [ ] Committed as `Phase 5: Requests and triage`
- [ ] "Where we left off" and status updated to Awaiting review
- [ ] **STOP** for review
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

- "My requests" list for requesters
- Settings screens (statuses, request types, teams)
- **Members reassigning tasks becomes a setting** (requested by the product owner, 2026-10-27)
  - Today (D36): only Team Admins and Org Admins can change a task's assignee; Members cannot, even on their own tasks
  - After the MVP: Team Admins and Org Admins can switch this on or off, so each team chooses whether its Members may reassign their own tasks
  - Where: a settings page that works per department (team), which could also hold the other settings above
  - Code to change: the assignee check in `TasksService.UpdateAsync` (API) and the `canReassign` input of the task drawer (web)
- Comments, audit log, notifications, email
- SSO (Entra ID, Google) behind `IDemoAuth`
- Azure deployment
- Multiple assignees per task
- Integrations, AI assistant, CSV export, mobile layout

## Progress log

- 2026-10-26: Read the brief, created `CLAUDE.md` and this plan. Decisions D1-D34 approved; Phase 0 committed. Starting Phase 1.
- 2026-10-26: Phase 1 built and verified (API smoke tests, web unit test, headless-browser walkthrough of login, team switcher and role landing pages). Committed; awaiting review.
- 2026-10-27: Phase 1 approved. Schedule rename (D35) and team dropdown fix. Phase 2 built and verified (10 API tests, 10 web unit tests, headless-browser walkthrough of columns, cards, drag between and within columns, filtered drag, filters, drawer edit, Marketing board, Member restrictions). Committed; awaiting review.
- 2026-10-27: Phase 2 review fixes (D36 admin-only reassign, disabled field styling, toast position); reassign setting recorded under Later. Phase 2 approved. Phase 3 built and verified (18 API tests, 19 web unit tests, headless-browser walkthrough of 1/2/4 weeks, paging, load colours, leave and holidays, greyed cross-team bars, All teams, Marketing, Member view). Committed; awaiting review.
