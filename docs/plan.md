# Juggle Demo Plan

Build plan for the demo in `docs/demo-brief.md`. Demo due Fri 2026-10-30. Finished phases, full decisions and the old progress log are in `docs/plan-archive.md`.

**Source of truth (from 2026-11-01):** `docs/requirements.md`, the client's functional requirements. Its "Client decisions" section overrides the rest of that document and `docs/demo-brief.md` where they conflict. The gap analysis, proposed data model, permission matrix and demo slice are in `docs/gap-analysis.md`; decisions D62 to D77 below record them.

## Where we left off

| | |
| --- | --- |
| Current phase | W - Workflow |
| Phase status | Awaiting review |
| Last completed task | Phase W review fixes, groups 1 to 4 (board and actions, allocation and schedule, Incoming and brief form, files and seed) |
| Next task | The brief form and job page redesigns the user has queued, then Phase V once Phase W is approved |
| Blockers / open questions | Client questions 1, 3, 4 and 6 to 12 in `docs/gap-analysis.md` section 7 stay on their defaults; question 8 (job categories) has a placeholder list in code until the client answers. Listed in the Phase J review summary for the client |
| Last updated | 2026-11-02 |

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
| C | - | Client demo for The Core Group | Done (folded into R) |
| R | - | Requirements and gap analysis | Done |
| J | - | Roles and jobs | Done |
| W | - | Workflow | Awaiting review |
| V | - | Views and demo | Not started |

Status values: Not started, In progress, Awaiting review, Done. A phase is Done only after the user approves it at its review gate.


## Decisions and assumptions

One line each. Full text, including superseded decisions, is in `docs/plan-archive.md` (read it only when needed). "Replaced" means the archive holds the old wording.

**Stack and tooling**

- D1 .NET 10 LTS, EF Core 10 with Npgsql, PostgreSQL 18, Angular latest stable, Tailwind v4, Angular CDK, npm
- D2 Solution file `api/Juggle.slnx`
- D3 Tests: xUnit v3, `WebApplicationFactory`, Testcontainers PostgreSQL (Docker must run); Angular default runner
- D4 No AutoMapper or MediatR; hand-written mapping; DataAnnotations validation
- D5 `Guid` v7 IDs, enums stored as strings, `Person.Skills` is `text[]`
- D6 The Angular dev server proxies `/api` (same-origin cookie, no CORS)
- D7 Dev database password is a local throwaway in `docker-compose.yml` and `appsettings.Development.json`
- D8 Work on `main`, one commit per item

**Data model and rules**

- D9 to D12 (request rejection reason, optional Person per User, request type, demo role labels): replaced by D50, D68 and D70
- D13 Working day = Mon-Fri, not a public holiday, not approved time off; bookings count only on working days
- D14 Day capacity = `Person.HoursPerDay`; utilisation = booked / capacity hours, can exceed 100%
- D15 Load colour: accent under 50% (available), then ok, warn (80 to 100%), over (above 100%)
- D16 A clash never blocks the save; the UI side is replaced by the Booking clash dialog (D41)
- D17 Time off is full days; only Approved leave reduces capacity
- D18 to D20 Triage, Studio statuses, review cycle: replaced by D69 and D58
- D21 Overdue = due date before today (Africa/Johannesburg) and not done
- D22 to D24 Card order, board filters in the browser, permissions: D24 replaced by D70
- D25 Other teams' bookings show greyed; "All teams" (admins, grid only) shows everyone
- D26 Landing pages: replaced by D70
- D27 Dashboard per person: this week and the next 4 weeks; work by department
- D28 "Book on schedule" form: replaced by Allocate and schedule (D68); D39 sets the defaults
- D29 Bookings can be deleted from the edit popover
- D30 Every user has "My requests" and a request detail page; the form is about 720px with a sticky tips panel
- D31 Original seed (Stark Industries): replaced by D54, then D73
- D32 Seed dates are relative to the week it runs; reset with `dotnet run --project api/Juggle.Api -- --reset-demo`
- D33 South African public holidays are calculated for this and next year
- D34 A bar move can change dates and person within the team
- D35 The capacity page is "Schedule" in the UI only; routes and API keep "capacity"
- D36 Only admins change an assignee (demo default; becomes a setting, see Later)
- D37 Schedule cells show no hours free; a day over capacity is tinted red with "+Nh"
- D38 Schedule layout: fixed-width days, narrow weekends, 1/2/4/8 weeks, availability strip, two-line bookings, time off as ink blocks
- D39 Drags use pointer events and day-cell hit tests; a move shifts by working days
- D40 Two-layer drag drawing: replaced by D41
- D41 Live drag: the dragged booking is its own preview; snap eases 120ms; Booking clash dialog on a drop that overbooks
- D42 Add task on the board: replaced by jobs (D68)
- D43 Side menu with a Requests group and a collapsible icon rail with tooltips and a flyout
- D44 User-facing text says "bookings" and "book", never "allocation" (code, routes and API keep "allocation")
- D45 Dashboard `GET /api/dashboard?teamId=<id>|all`; summary cards link to filtered pages
- D46 My work (`/my-work`): the person's open jobs, this and next week's schedule, upcoming time off
- D47 Time off requests: Pending, Approved, Declined (reason), Cancelled; approvers by capability; sick leave masked as "Unavailable"

**Phase C (client demo, partly superseded by Phase R)**

- D48 `Organisation.DepartmentLabel` names the department concept in the UI ("Brand" for The Core Group)
- D49 to D51 Studio workflow, request fields, accept as new brief: replaced by D68 and D69
- D52 Job code `<PREFIX><NNNN>_Q<n>'<YY>_<name>`, prefix per brand; the number source is replaced by D71
- D53 Dashboard "Awaiting review" card
- D54 Seed for The Core Group: replaced by D73
- D55 Who a brief is from: replaced by D58
- D56 Briefs report (`/t/:teamId/briefs`) with brand and period filters
- D57 Booked indicator chip on cards ("Booked Nh" or "Not booked", amber when due soon)
- D58 The requester is always the signed-in user; no Requester role or "Requested by" field
- D59 Schedule drawer actions: "View on schedule" and "Add booking" stay; "Book on schedule" is replaced by D68
- D60 Schedule "People" filter (search, select all, per person)
- D61 Brand colours: one palette hue per brand, used by its cards and bookings

**Phase R and J (client requirements, `docs/gap-analysis.md`)**

- D62 (CD1) The Traffic Manager is a separate role that reviews briefs, allocates designers and owns the schedule
- D63 (CD2) Job ID `<BRAND><per-brand number>_Q<n>'<YY>_<name>`, e.g. `DJI0143_Q1'27_Summer Holiday Sale`
- D64 (CD3) Five board columns: Incoming, In Design, In Review, With Marketing, Done; the detailed status shows on the card
- D65 (CD4) Stakeholders get no logins; the Marketing Manager records their outcome on the job
- D66 (CD5) Marketing Managers see only their own jobs and reports
- D67 (CD6) The requester is the signed-in Marketing Manager; submitting on behalf is deferred
- D68 A board card is a Job (brief sections A to F, deliverables, links); `Projects` and `Tasks` are gone
- D69 Statuses (16 plus Cancelled) and board columns are per-organisation data
- D70 Five roles as per-organisation data with capabilities; every action is checked on the server by capability
- D71 Job number from the per-brand atomic counter `Department.LastJobNumber`, fixed at submission
- D72 Approvals, revisions, history and artwork versions (links) are records: `JobApproval`, `JobRevision`, `JobEvent`, `JobArtwork`
- D73 Seed: The Core Group, 14 brands, one team "Design Studio", 18 users
- D74 A card drag between columns runs the one workflow action the role may take; any other drop is refused with a hint
- D75 Cancelled: the Traffic Manager cancels from any open status with a reason; shown in Done, left out of completed counts
- D76 Scheduled sits in In Design and shows "Starts <date>"; Incoming is the Traffic Manager's queue only
- D77 Juggle is configurable per organisation: roles, capabilities, statuses, columns, workflow, terms and the job ID format are data, never code checks
- D78 Reassign and Reschedule are logged on the job but are not workflow steps: a booking moved to another person reassigns the job if that person was its designer; a booking's dates set the job's planned start and expected completion

- D79 A job accepts bookings while it is open and in Incoming or In Design (`JobDto.AcceptsBookings`, the board's first two columns). The Booked chip, the drawer's booking actions and the schedule's job picker use it. The schedule offers unallocated jobs (booking one runs Allocate and schedule) and the row's own jobs; the API refuses a booking on any other job
- D80 A job's deadline is the earliest of its required date and its deliverables' deadlines; overdue, due soon and the lateness warnings use it. A deliverable deadline is optional ("Same as job") and cannot be after the required date
- D81 Booking checks (`GET /api/allocations/check` and `/availability`): Allocate and schedule shows the designer's capacity and the deadline live, offers Fit before deadline, and asks once before saving when either applies; moves, resizes and reassigns check the deadline too. A check never blocks a save (D16)
- D82 The board's drag uses CDK with each column a drop list (sorting off, no transfers) so the preview is lifted into the page, not clipped by the column; a move under 3px is a click. A drop on a column several actions lead to opens a menu of them at the drop point (replaces the refusal in D74)
- D83 Files (`JobFile`: Brief, Supporting, Artwork) are kept by `IFileStore`: Azure Blob Storage when `Files:ConnectionString` is set, otherwise a local folder. 25 MB, an extension allow-list, downloads only through the API as attachments for users who can see the job; an artwork file follows the artwork's visibility (the requester waits for the design approval). An artwork version is a link or a file; only the user who briefed a job attaches brief files
- D84 Incoming's three sections group the queue by status name (Awaiting Traffic Review and Awaiting Information; Awaiting Allocation; Awaiting Revision Scheduling)

## Review gate (ends every phase)

- Build passes with no warnings, lint passes, smoke tests pass
- Acceptance criteria ticked
- Committed as `Phase N: <milestone>`
- "Where we left off" and the phase status updated to Awaiting review
- **STOP.** Post a review summary: what was built, how to run it, what to click to check it, any deviations from this plan. Wait for the user
- Approved by user: review fixes committed, status set to Done

---

## Phase W - Workflow

**Status:** Awaiting review
**Done when:** one job runs from brief to close across all five roles, with one revision routed back through the Traffic Manager, and every step is recorded

**Tasks**

- [x] W.1 Traffic Manager: Incoming (replaces Triage), Brief complete, Allocate and schedule (makes the booking; clash, leave and deadline warnings), View on schedule, Add booking (hidden at or above the estimate), reassign and reschedule, Cancel with a reason (D75)
- [x] W.2 Request information and the Marketing Manager's answer (Awaiting Information, Awaiting Traffic Review)
- [x] W.3 Designer: Start, Submit artwork link (`JobArtwork` versions); no Schedule in the nav
- [x] W.4 Head of Design: approval queue, Approve and Send back with a comment (`JobApproval`)
- [x] W.5 Marketing Manager: Approve, Needs business approval, Record business approval (stakeholder, date, outcome, note, link), Close
- [x] W.6 Revisions: Request changes creates a `JobRevision` that goes to the Traffic Manager and is scheduled, worked and approved; revision badge on the card; the job page lists versions, approvals, revisions and history
- [x] W.7 Drag between columns (D74): a drop that maps to exactly one action for the role runs it; any other drop is refused with a hint naming the action

**Acceptance criteria**

- [x] Each transition in `docs/gap-analysis.md` section 2 works for its role only, and is refused for every other role and status
- [x] No artwork reaches the Marketing Manager before Head of Design approval
- [x] A revision goes to the Traffic Manager, never straight to the designer, and keeps the same job ID
- [x] Every action writes a `JobEvent` with user and time; approvals record reviewer, time, decision, comment and version

**Review fixes (2026-11-02, one commit per group)**

- [x] Group 1, board and actions: drag preview no longer clipped, 3px click rule, grab cursor and drop hints, drop menu, every action offered in the drawer, job page and Approvals, Booked chip only in Incoming and In Design, overdue dates in red
- [x] Group 2, allocation and schedule: live capacity and deadline warnings with Fit before deadline and one confirmation, designer picker with free hours and a placeholder, compact form, revisions pre-select the designer, schedule bookings follow the job rules
- [x] Group 3, Incoming and brief form: three sections, "Checked, allocate later", optional deliverable deadline, Team hidden for one team
- [x] Group 4, files and seed: uploads for the brief and artwork, seeded approval queues, `dotnet test` zero-tests cause

**Review gate**

- [x] Build passes with no warnings, lint passes, smoke tests pass
- [x] Acceptance criteria ticked
- [x] Committed, one commit per step
- [x] "Where we left off" and the phase status updated to Awaiting review
- [x] **STOP** for review
- [ ] Approved by user

---

## Phase V - Views and demo

**Status:** Not started
**Done when:** each role has its dashboard, Reports is its own menu item scoped by role, and the demo script in `docs/gap-analysis.md` section 4 runs start to finish on freshly reset data

**Tasks**

- [ ] V.1 Marketing Manager dashboard (submit a brief, jobs by stage, information requests); My requests with search
- [ ] V.2 Traffic Manager dashboard (incoming, awaiting allocation, deadlines and overdue, not booked, capacity)
- [ ] V.3 Head of Design dashboard (approval queue with actions, in progress, amendments, overdue, workloads, completed)
- [ ] V.4 Designer dashboard, from My work (today, upcoming, in progress, awaiting approval, changes required, completed, calendar, workload)
- [ ] V.5 Head of Marketing dashboard (totals, by brand, Marketing Manager and designer, capacity, turnaround, revision volumes; brand and period filters)
- [ ] V.6 Reports menu item; the briefs report moved and scoped by role (all, own activity, own requests)
- [ ] V.7 Board text search (job ID, title, brand, campaign, Marketing Manager, designer); nav count badges
- [ ] V.8 `docs/demo-brief.md` script and seed table, README, rehearsal on freshly reset data, screenshots

**Acceptance criteria**

- [ ] Each dashboard shows the items of section 5 for its role, with only the data that role may see
- [ ] Reports is a menu item for every role, and each role sees only its scope
- [ ] The demo script runs start to finish

**Review gate**

- [ ] Build passes with no warnings, lint passes, smoke tests pass
- [ ] Acceptance criteria ticked
- [ ] Committed, one commit per step
- [ ] "Where we left off" and the phase status updated to Awaiting review
- [ ] **STOP** for review
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
- Studio logging briefs on behalf of a manager (requested 2026-11-01): a Studio member enters a brief that arrived by email or phone for a brand's marketing manager, who then follows it in My requests (D55 did this; D58 removed it for the demo)
- Review-fix follow-ups (2026-11-02): Fit before deadline and the "working days late" count use the designer's calendar, not other designers'; Traffic Managers attaching files to a brief; a real "Same as job" placeholder if the date input gets a text mode; Incoming sections and the bookable columns by configuration, not by status and column position (D77); a settings screen for the 25 MB limit and allowed types
- Comments, audit log, notifications, email
- Board column preferences stored per user in the database, so they follow the user across devices (today they are in localStorage, per browser)
- SSO (Entra ID, Google) behind `IDemoAuth`
- Azure deployment
- Multiple assignees per task
- Integrations, AI assistant, CSV export, mobile layout
- **Per-organisation configuration** (D77, 2026-11-01): settings screens for roles and capabilities, statuses and columns, the workflow and terms; custom brief form fields per organisation; workflow templates for new organisations; a configurable working week; organisation by subdomain
- **Deferred from the client's requirements to the MVP** (2026-11-01, `docs/gap-analysis.md` section 4):
  - File uploads beyond the brief and artwork files (D83): working files, preview in the page, replacing or deleting a file, virus scanning
  - Notifications (section 8), email and in-app, beyond the nav counts
  - Comment threads on jobs: replies, tags, attachments
  - An organisation-wide audit screen and export (each job's own history is in the demo)
  - Reopening a closed job, and a new job linked to the original (section 4)
  - Head of Marketing administrative overrides (section 10 "\*"): submit on behalf, allocate, close
  - User and permission management screen
  - Configurable naming convention (11.2)
  - Designers flagging blockers, and the "Internal Review" designer status (3.3)
  - The rest of section 9 reporting: time per stage, reasons for delays, designer performance
  - Advanced search with date ranges
  - External calendar, and deadlines on the calendar (11.6)
  - Marketing Managers seeing their brands' jobs (CD5 open question)
  - Bookings by time of day

## Progress log

- 2026-11-01: Phase C review round, one commit each. C.14 requester model (D58, replaces D55): no "Requested by" or Requester role, `LoggedByUserId` and `User.DepartmentId` dropped, brand managers as Studio Members managing one or more brands, the board filtered to their brands, Approve and Request changes on Awaiting approval. C.15 drawer schedule actions (D59). C.16 schedule People filter (D60). C.17 brand colours with a brand key on Board and Schedule (D61). Build with no warnings, lint, 80 API tests and 137 web tests pass; each item checked in Chromium at 1440 against the API on 5268. Demo data reset. Awaiting review.
- 2026-11-01: Phase R: the client's functional requirements (`docs/requirements.md`) became the source of truth. Wrote `docs/gap-analysis.md` (gaps per area, the job data model and status map, the permission matrix, the demo slice, pending items, phases, open questions). Recorded the client decisions (D62 to D67) and the proposed decisions (D68 to D73: a card is a job, standard statuses, five roles, job number counter, approval and revision records, the 18-user seed); planned Phases J, W and V; folded Phase C's C.18 into this review. No code changed. Awaiting review.
- 2026-11-01: Phase R approved (D74 to D76 added); D77 recorded (Juggle configurable per organisation). J.1 built: roles as org data with capabilities, access by capability, organisation terms and settings, login by role, nav and landing from capabilities, seed of The Core Group's five roles and 18 users in one studio. Build with no warnings, lint, 82 API tests and 135 web tests pass; checked in Edge at 1440. Demo data reset.
- 2026-11-01: D77 recorded fully in `docs/plan.md` and `docs/gap-analysis.md`. J.2 pre-work: `Features/Workflow/JobWorkflow.cs`, `WorkflowController.cs` and `WorkflowDtos.cs` scaffolded (untracked). Session ended at the CLI limit before `Auth/JobAccess.cs` was written. Docs updated.
- 2026-11-01: The previous session left more of J.2 uncommitted than the log said: besides the workflow files, the `Job` and workflow entities, `Features/Jobs` and the removal of requests, projects and tasks were in the working tree. J.2 finished: jobs on the board in the org's columns, job visibility by capability, the incoming queue, My work and My requests on jobs, the dashboard and report on jobs, the seed of the workflow and jobs, migration `Jobs`. Build with no warnings, lint, 69 API tests and 126 web tests pass; checked in Chromium at 1440. Demo data reset.
- 2026-11-01: J.3 built: job IDs from the org's format and an atomic per-brand counter at submission, never changed; migration `JobNumbers`; the brief form starts on the only team for marketing managers. Build with no warnings, lint, 76 API tests and 127 web tests pass; DJI0143 checked in Chromium at 1440.
- 2026-11-01: J.4 built: the brief form in the client's template, sections A to F, with deliverable rows (type, specifications, deadline) and supporting links; the job page shows the whole brief; migration `BriefSections`. Build with no warnings, lint, 77 API tests and 129 web tests pass; checked in Chromium at 1440. Demo data reset. Phase J awaiting review.
- 2026-11-02: Phase J approved and done. Phase W not started; waiting for the user to say to start.
- 2026-11-02: Phase W started. W.1 built: `JobActionAccess` answers which workflow actions a user may take on a job (the workflow allows it in the status, the role has the capability, and the requester or designer where the action needs it); `JobDto.Actions` lists them and the web shows a button for each. Incoming replaces Triage with Request information, Brief complete, Allocate and schedule (booking and status change saved together; clash, leave and late warnings) and Cancel with a reason. Moving a booking to another person or other dates reassigns or reschedules the job and logs it (D78). No schema change. Build with no warnings, lint, 86 API tests and 131 web tests pass.
- 2026-11-02: W.2 built: the requester answers a question (Awaiting Information to Awaiting Traffic Review); the job page shows the next-step actions and an Activity list of every `JobEvent` with who, when, the status and the message. No schema change. 88 API tests and 131 web tests pass.
- 2026-11-02: W.3 built: the designer starts a scheduled job and submits an artwork link, recorded as numbered `JobArtwork` versions (migration `JobArtwork`); the job page lists the versions and the drawer links to it. The user who briefed the job sees no artwork yet. 90 API tests and 131 web tests pass. A test caught a version-number bug (precedence in `1 + max ?? 0`), fixed.
- 2026-11-02: W.4 built: Approvals page and nav badge for users who approve; the head of design approves the design or sends it back with a required comment, each recorded as a `JobApproval` with reviewer, time, decision, comment and the artwork version (migration `JobApprovals`). The user who briefed a job sees only the artwork versions the head of design approved. 92 API tests and 131 web tests pass. Two shared-data tests (dashboard, report) made independent of other tests' jobs.
- 2026-11-02: W.5 built: the marketing manager who briefed a job approves the artwork the head of design approved, sends it for business approval, records a stakeholder's approval (who, the day they decided, note, link; not future-dated) and closes the job (close date and user stored). Only the requester may; the head of design and traffic manager may not. No schema change. 95 API tests and 131 web tests pass.
- 2026-11-02: W.6 built: Request changes (from marketing or, with who and when, a stakeholder's decision) records the approval, creates a numbered `JobRevision` (migration `JobRevisions`) and sends the job to the traffic manager as Awaiting Revision Scheduling with the same job ID and an optional new required date; Allocate and schedule then sets the revision's designer and estimate (the job's estimate becomes the total) and makes that designer the job's designer; the head of design's approval completes the revision. The card shows "Rev N"; the job page lists revisions, approvals, artwork versions and activity. 97 API tests and 131 web tests pass.
- 2026-11-02: W.7 built: a card dragged to another column runs the one workflow action the user may take that leads there (clicks run at once; forms open in the job drawer); any other drop is refused with a hint naming the actions (D74). The workflow endpoint now lists each step. Phase W awaiting review. Build with no warnings, lint, 99 API tests and 136 web tests pass; a headless Chrome check (text only) passed: Incoming actions and forms, a drop on Done opening Cancel, a drop on In Review refused with the hint, Approvals for the head of design, Activity on the marketing manager's job page, no console errors. Known gap for Phase V: the seeded jobs in approval statuses have no artwork or approval records, so their queue entries say "No artwork to review" until the seed is extended (V.8).
- 2026-11-02: Phase W review fixes, four commits. Group 1: the dragged card stayed inside its column's scroll area (no drop list, so no preview in the page) and was clipped; each column is now a drop list with sorting off, a move under 3px is a click, draggable cards show a grip and grab cursor, valid columns name the action and others dim, a drop several actions lead to opens a menu (D82). The actions panel listed only four actions, so the designer, head of design and marketing manager had no buttons in the drawer, job page or Approvals; all actions are listed now. Group 2: D79 to D81. Group 3: D84, "Checked, allocate later" with a tooltip, D80. Group 4: D83 with migration `JobFiles`, seeded artwork and approvals for the three approval statuses, and the zero-tests cause: with the Microsoft.Testing.Platform runner in `global.json`, VSTest switches such as `--nologo` are passed to the xUnit test app, which rejects them, and `dotnet test` reports "Zero tests ran" (exit 5); `dotnet test api/Juggle.slnx` runs all tests, as the README now says. Build with no warnings, lint, 112 API tests and 150 web tests pass; checked in headless Chrome as the traffic manager, designer, head of design and marketing managers. Demo data reset. Awaiting review.
