# Gap analysis: Juggle against the client's requirements

Source of truth: `docs/requirements.md`. Its "Client decisions" (CD1 to CD6, 1 November 2026) override the rest of that document and `docs/demo-brief.md` where they conflict. Section numbers below refer to `docs/requirements.md`; D-numbers refer to decisions in `docs/plan.md`.

Written 2026-11-01 against commit `30f2b5b` (Phase C, C.14 to C.17 built and awaiting review).

Status values: **Built**, **Partly built**, **Missing**, **Conflicts** (built, but in a way the requirements rule out).

## Summary

Juggle today is a general team planner: three roles (Org Admin, Team Admin, Member), board columns each team can configure, and a card for each deliverable. The schedule, leave and capacity (section 7) are mostly built and stay as they are. The client asks for a different job model: five fixed roles, 16 standard statuses grouped into five columns, a job as the unit of work, an approval chain (Head of Design, then Marketing Manager, then any recorded business approval), and revisions that go back through the Traffic Manager. The data model changes in the middle: requests, projects and tasks become **jobs**. Before this analysis the user confirmed that a board card is a job, with one designer and one detailed status. Deliverables become items inside the brief.

## 1. Gaps by requirement area

| Area | Status | Today | Gap |
| --- | --- | --- | --- |
| Roles and permissions (2, 10, CD1, CD5, CD6) | Conflicts | Org Admin, Team Admin and Member per team (D24). Brand marketing managers are Studio Members who manage brands through `DepartmentManager`; they see the board (their brands only) and the schedule (read-only) (D58). The Requester role, "Requested by" and `LoggedByUserId` are already gone (D58, migration `BrandManagers`) | No Head of Marketing, Head of Design or Traffic Manager. Marketing Managers must not see the board, schedule or workloads (CD5). Designers must not book their own work (CD1). Admin overrides and user management are missing |
| Stage 1, brief submission (3.1) | Partly built | Request form, triage inbox, My requests, request detail (D30, D50) | The job ID comes at triage, not at submission. Many brief fields are missing (see Brief form) |
| Stage 2, Traffic Manager review and allocation (3.2) | Partly built | Triage accept: new brief or existing project, assignee, estimate, committed date; "Book on schedule" (D28, D51, D59) | No request for information. No planned start or expected completion on the job. No deadline conflict warning. Allocation and booking are separate steps. Triage is for team admins, not a Traffic Manager |
| Stage 3, design execution (3.3) | Partly built | Designers move their own cards between columns; My work (D46) | No artwork submission or versions, no "submit for approval" action. Comments and blockers are missing |
| Stage 4, Head of Design approval (3.4) | Missing | Any admin can drag a card to Done | No approval step, queue or record of reviewer, time, decision, comment or version |
| Stage 5, Marketing Manager review (3.5) | Conflicts | The brand manager approves or requests changes on cards in "Awaiting approval" (D58) | Today this happens before any Head of Design approval, and changes go straight back to the designer. Business approval cannot be recorded |
| Stage 6, revisions (3.6) | Conflicts | `TaskItem.ReviewCycle` goes up when a card is sent back; the latest comment is kept in `TaskItem.Feedback` | Revisions must go to the Traffic Manager and be linked records (number, requester, reason, designer, completion, approvals) |
| Stage 7, closure (3.7) | Missing | Approval moves the card to Done | No close action, closed date, closed by, total time or revision count |
| Reopen and linked jobs (4) | Missing | None | Reopen a closed job without losing history; new job linked to the original |
| Statuses and the five board columns (6, CD3) | Conflicts | `WorkflowStatus` rows per team, configurable: Triage, Briefed in, Working on it, Feedback needed, Awaiting approval, Done (D49) | 16 standard statuses, each in one of five columns (Incoming, In Design, In Review, With Marketing, Done). The detailed status shows on the card and drives permissions and reports |
| Brief form (3.1 A to F) | Partly built | Team, brand, job name, main goal, deliverables (one per line), studio deadline, priority (D50) | Missing: campaign, category, new or revision, objectives (B), deliverable type, specs and deadline (C), creative guidelines (D), supporting links (E), additional information (F) |
| Approvals, including recorded business approval (3.4, 3.5, CD4) | Missing | Only the latest feedback text on a card | Approval records for each stage, and a business approval recorded by the Marketing Manager (who approved, date, note, link) |
| Role dashboards (5) | Partly built | One admin dashboard: utilisation, overdue, awaiting review, triage, work by brand (D45, D53); My work for anyone with a Person (D46) | Five role-specific dashboards with the counts and lists in 5.1 to 5.5 |
| Resource planner (7, 11.6) | Built, mostly | Schedule with 1, 2, 4 or 8 weeks; drag to create, move (dates and person) and resize; clash and leave warnings; SA public holidays and Africa/Johannesburg; leave requests and approval; people filter; brand colours (D38 to D41, D47, D60, D61) | Bookings belong to projects and tasks, not jobs. No single-day view, no deadline conflict alert, no completed vs outstanding view, deadlines not on the calendar, no external calendar |
| Notifications and comments (8) | Missing | Nav counts for triage and time off only | Event notifications, comments for each job (reply, tag, attachments) |
| Audit trail (11.5) | Missing | None | Every important action recorded with user and timestamp |
| Files and artwork versions (11.3) | Missing | One `Link` per task | Brief, supporting files, working files, draft, revised and final artwork, with versions kept |
| Job IDs and naming (11.1, 11.2, CD2) | Partly built | `<PREFIX><NNNN>_Q<n>'<YY>_<job name>`, prefix per brand, financial year starting in October (D52) | The number is worked out from the highest number in the brand's project names, at triage. It should be a stored counter that never resets, assigned at submission and never changed. The naming convention cannot be configured by an admin |
| Reports (9) | Partly built | Briefs report: completed vs in progress, capacity by designer, briefs received per month, brand filter; team admins only, under Dashboard (D56) | Turnaround, time per stage, revisions, delays, designer performance; reports scoped by role (own activity, own requests); Reports as its own menu item |
| Search and filters (11.4) | Partly built | Board filters for assignee, brand, due date and booking (D23, D57) | Text search by job ID, title, campaign, Marketing Manager or designer; date filters |

## 2. Proposed data model changes

### Organisation configuration (D77)

Juggle is configurable per organisation; The Core Group is the first organisation's configuration, not behaviour in code. No code checks a role or status name.

| Fixed in code | Stored per organisation as data |
| --- | --- |
| The workflow actions: Submit, Request information, Answer, Mark ready, Cancel, Allocate and schedule, Start, Submit for approval, Approve design, Send back, Approve marketing, Needs business approval, Record business approval, Request changes, Close | Roles and their capabilities (`Role`; `User.RoleId`) |
| What each action does besides changing the status (makes a booking, a revision, an approval record, a close date), and who on the job may take it (anyone with the capability, or only the job's requester or its designer) | Board columns (`BoardColumn`: name, order) and statuses (`JobStatus`: name, column, order, colour from the 8 palette hues, kind: open, done or cancelled) |
| The capabilities that gate the actions and pages (`Capability`): SubmitBrief, TriageBriefs, Allocate, ViewSchedule, WorkOnJobs, ApproveDesign, ApproveMarketing, CloseJob, ViewAllJobs, ViewBoard, ViewReports, ApproveTimeOff, ManageUsers | The workflow (`WorkflowTransition`: action, from status, to status, the approval stage it records), so an org can leave a stage out |
| The working week (Monday to Friday) | Terms (the department, brief and job words; role names), the job ID format, the financial year start month, default working hours per day, holiday country |

Tenancy: one shared database with `OrgId` on every table and global query filters stays the default. No cross-org queries outside admin tooling (today only the demo login list and the seeder), so one org can later move to its own database or deployment. Org by subdomain is under Later in `docs/plan.md`.

### Roles

- `Role` per organisation (name, order, capabilities) and `User.RoleId` replace `User.OrgRole` and `TeamMembership.Role`. The Core Group's roles are Head of Marketing, Head of Design, Traffic Manager, Designer and Marketing Manager, with the capabilities in section 3
- `Team` stays, with one team, "Design Studio", so the `/t/:teamId` routes and Juggle's support for several teams survive. `TeamMembership` stays as the list of people on that studio's planner
- Only the 6 designers have a `Person` (a row on the schedule)
- `DepartmentManager` (a Marketing Manager's brands) stays: it sets the default brand on the brief form, and it is what open question 1 would need
- `Auth/TeamAccess.cs` becomes capability-based `JobAccess`: `VisibleJobs()` returns every job with ViewAllJobs, otherwise the jobs the user submitted or is the designer of (CD5). Capability checks for each action live in one place
- Already done (D58): no Requester role, no "Requested by", `Request.LoggedByUserId` dropped. The requester is always the signed-in Marketing Manager (CD6)

### Job

The `Requests` table is renamed to `Jobs` and extended. `Projects`, `Tasks` and `WorkflowStatuses` are dropped.

| Group | Fields |
| --- | --- |
| Identity | `Number` (int, unique per `DepartmentId`), `Code` (set at submission and never changed, e.g. `DJI0143_Q1'27_Summer Holiday Sale`), `TeamId`, `DepartmentId` (brand), `RequesterUserId`, `CreatedAt` (date briefed) |
| A. Job information | `Title`, `Campaign`, `Category` (fixed list in code, open question 8), `Priority`, `RequiredDate` |
| B. Objectives | `Purpose` (was `MainGoal`), `Objective`, `TargetAudience`, `KeyMessage`, `Channels`, `ExpectedOutcome` |
| D. Creative guidelines | `CreativeDirection`, `BrandRequirements`, `ColoursAndTypography`, `DesignReferences`, `MandatoryMessaging`, `RequiredLogos`, `ProductImagery`, `LegalDisclaimers`, `CreativeInstructions` |
| F. Additional | `AdditionalInformation` |
| Workflow | `StatusId` (the org's `JobStatus`), `DesignerPersonId`, `EstimateHours`, `PlannedStartDate`, `ExpectedCompletionDate`, `ClosedAt`, `ClosedByUserId` |

Dropped: `Request.Status`, `TaskId`, `RejectionReason`, `Deliverables` (text), and with the tasks `ReviewCycle`, `Feedback`, `SortOrder` and `Link`.

### New tables

Each table has `OrgId` and the global query filter.

| Table | Fields | Covers |
| --- | --- | --- |
| `JobDeliverable` | `Type` (the 10 types in 3.1C, plus Other), `Description` (200), `Specifications` (500, dimensions and specs), `DueDate?`, `SortOrder` | 3.1C, several deliverables per brief |
| `JobLink` | `Url`, `Label` | 3.1E supporting material and reference links |
| `JobArtwork` | `Version` (per job), `Url`, `Note`, `SubmittedByUserId`, `SubmittedAt` | 11.3 versions; links in the demo, files in the MVP |
| `JobApproval` | `Stage` (Design, Marketing, Business), `Decision` (Approved, ChangesRequested), `ArtworkId` (version reviewed), `RecordedByUserId`, `RecordedAt`, `Comment`; business only: `StakeholderName` (e.g. "Sales"), `DecidedOn`, `Link` | 3.4 and 3.5 approval records; CD4 recorded business approval |
| `JobRevision` | `Number`, `RequestedByUserId`, `RequestedAt`, `Source` (Marketing, Business), `Reason`, `Changes`, `RevisedRequiredDate?`, `Link?`, `DesignerPersonId`, `EstimateHours`, `CompletedAt?` | 3.6 revisions linked to the original job, with the same job ID |
| `JobEvent` | `UserId`, `At`, `Type`, `FromStatus`, `ToStatus`, `Message` | 11.5 audit trail, written by every action from the start; also holds the information request and the answer |

### Changed

- `Allocation.ProjectId` and `TaskId` become `JobId` (required): each booking belongs to a job
- `Department.LastJobNumber`: a counter for each brand that never resets (CD2). It starts from the brand's history and goes up atomically (`UPDATE ... RETURNING`) when a brief is submitted. A unique index on (`DepartmentId`, `Number`) guards against duplicates. This replaces the parsing of project names in `JobCodes.NextNumber`; `JobCodes.Name` and `FinancialQuarter` stay

### Detailed status and board column

The Core Group's statuses and columns, seeded as its configuration (D77). Permissions come from the workflow's actions and their capabilities, and reports from each status's kind, so nothing depends on a status's name.

| Column | Status | Who acts next |
| --- | --- | --- |
| Incoming | New Request | Traffic Manager |
| Incoming | Awaiting Information | Marketing Manager |
| Incoming | Awaiting Traffic Review (after the Marketing Manager answers) | Traffic Manager |
| Incoming | Awaiting Allocation | Traffic Manager |
| Incoming | Awaiting Revision Scheduling | Traffic Manager |
| In Design | Scheduled | Designer |
| In Design | In Progress | Designer |
| In Design | Design Changes Required | Designer |
| In Design | Revision Scheduled | Designer |
| In Design | Revision In Progress | Designer |
| In Review | Awaiting Design Approval | Head of Design |
| With Marketing | Awaiting Marketing Approval | Marketing Manager |
| With Marketing | Awaiting Business Approval | Marketing Manager |
| With Marketing | Marketing Changes Required (open question 3; in the demo it is recorded on the approval and the job moves straight to Awaiting Revision Scheduling) | Marketing Manager |
| With Marketing | Approved / Ready to Close | Marketing Manager |
| Done | Closed / Completed | - |
| Done | Cancelled (D75: rejected or cancelled by the Traffic Manager with a reason; left out of completed counts) | - |

Approved at the Phase R review: Scheduled sits in In Design, and Incoming is the Traffic Manager's queue only; cards in Scheduled show "Starts <date>" (D76).

### Transitions

The Core Group's workflow, seeded as `WorkflowTransition` rows (D77). One `JobWorkflow` class reads them and answers which actions a user may take on a job (capability, plus requester or designer where the action needs it), with unit tests. Cards move only through these actions. The role named below is the one with the action's capability in The Core Group.

| Action | Role | From | To |
| --- | --- | --- | --- |
| Submit brief | Marketing Manager | - | New Request |
| Request information | Traffic Manager | New Request, Awaiting Traffic Review, Awaiting Allocation | Awaiting Information |
| Answer | Marketing Manager | Awaiting Information | Awaiting Traffic Review |
| Mark ready (brief complete) | Traffic Manager | New Request, Awaiting Traffic Review | Awaiting Allocation |
| Allocate and schedule (creates the booking) | Traffic Manager | New Request, Awaiting Traffic Review, Awaiting Allocation | Scheduled |
| Schedule revision (creates the booking) | Traffic Manager | Awaiting Revision Scheduling | Revision Scheduled |
| Start | Designer | Scheduled, Revision Scheduled | In Progress, Revision In Progress |
| Submit artwork | Designer | In Progress, Revision In Progress, Design Changes Required | Awaiting Design Approval |
| Approve design | Head of Design | Awaiting Design Approval | Awaiting Marketing Approval |
| Send back | Head of Design | Awaiting Design Approval | Design Changes Required |
| Approve | Marketing Manager | Awaiting Marketing Approval | Approved / Ready to Close |
| Needs business approval | Marketing Manager | Awaiting Marketing Approval | Awaiting Business Approval |
| Record business approval: approved | Marketing Manager | Awaiting Business Approval | Approved / Ready to Close |
| Request changes, or business approval with changes (new revision) | Marketing Manager | Awaiting Marketing Approval, Awaiting Business Approval, Approved / Ready to Close | Awaiting Revision Scheduling |
| Close | Marketing Manager | Approved / Ready to Close | Closed / Completed |
| Cancel, with a required reason (D75) | Traffic Manager | Any open status | Cancelled |

Approved at the Phase R review: dragging a card between columns runs an action only when the drop maps to exactly one action the role may take; any other drop is refused with a hint naming the action (D74).

### Migration impact

- One migration per step: `Roles`, `Jobs`, `JobNumbers`, `BriefSections`, then one for each workflow table as it arrives
- There is no production data. The migrations change the schema without carrying demo rows across (projects and tasks dropped, requests renamed to jobs), and `--reset-demo` reseeds after each step
- API code affected: nearly every feature: `Tasks` (becomes `Jobs`), `Requests`, `Allocations`, `Capacity` (job code on bookings), `Dashboard`, `MyWork`, `Reports`, and the statuses and projects endpoints in `Teams`. Most API tests change with the seed
- Web code affected: board, triage, requests, My work, dashboard, reports, schedule booking labels, `core/models.ts`
- Reused unchanged: the schedule grid and drag, clash and leave dialogs, time off, public holidays, `<app-select>`, `appTooltip`, the brand key, the people filter and the design tokens

## 3. Permission matrix as implemented

Follows section 10, with CD1 and CD5. Rows marked "\*" in section 10 (administrative override) are "Override (MVP)": not in the demo. Enforced on the server in `JobAccess` and `JobWorkflow` by capability (D77). The nav hides what a role cannot use.

The Core Group's roles and their capabilities (seeded data):

| Capability | Head of Marketing | Head of Design | Traffic Manager | Designer | Marketing Manager |
| --- | --- | --- | --- | --- | --- |
| ViewAllJobs | Yes | Yes | Yes | - | - |
| ViewBoard | Yes | Yes | Yes | Yes | - |
| ViewSchedule | Yes | Yes | Yes | - | - |
| ViewReports | Yes | Yes | Yes | Yes | Yes |
| SubmitBrief | - | - | - | - | Yes |
| TriageBriefs | - | - | Yes | - | - |
| Allocate | - | - | Yes | - | - |
| WorkOnJobs | - | - | - | Yes | - |
| ApproveDesign | - | Yes | - | - | - |
| ApproveMarketing | - | - | - | - | Yes |
| CloseJob | - | - | - | - | Yes |
| ApproveTimeOff | - | - | Yes | - | - |
| ManageUsers | Yes | - | - | - | - |

Without ViewAllJobs, a user sees the jobs they submitted or are the designer of. Answer, Approve marketing, Needs business approval, Record business approval, Request changes and Close are for the job's requester; Start and Submit for approval for its designer.

What that gives each role:

| Functionality | Head of Marketing | Head of Design | Traffic Manager | Designer | Marketing Manager |
| --- | --- | --- | --- | --- | --- |
| View jobs | All (read) | All | All | Assigned to them | Submitted by them (CD5) |
| Board | Yes (read) | Yes | Yes | Own jobs | No |
| Schedule and designer workloads | Read | Read | Edit | Own only, on My dashboard | No |
| Submit briefs | Override (MVP) | Override (MVP) | Override (MVP) | No | Yes |
| Review incoming briefs, request information | View | View | Yes | No | Answers requests |
| Allocate and book designers | Override (MVP) | Override (MVP) | Yes | No (CD1) | No |
| Reassign and reschedule | Override (MVP) | Override (MVP) | Yes | No | No |
| Submit artwork (link) | Override (MVP) | Override (MVP) | Override (MVP) | Own jobs | No |
| Approve design work | No | Yes | No | No | No |
| Send back or request revisions | Override (MVP) | Send back to the designer | Override (MVP) | No | Yes, routed to the Traffic Manager |
| Approve final artwork, record business approval | Override (MVP) | No | No | No | Own jobs, after Head of Design approval |
| Close jobs | Override (MVP) | No | No | No | Own jobs |
| Reports | All | All | All | Own activity | Own requests |
| Request own time off | - | - | - | Yes | - |
| Approve time off | - | - | Yes (open question 6) | No | - |
| Manage users and permissions | Yes (MVP screen) | No | No | No | No |

## 4. Demo slice

The full journey of one job across all five roles, plus one revision routed back through the Traffic Manager.

### Demo script

1. **Login:** 18 users, grouped by role
2. **Marketing Manager (Zanele, DJI):** My dashboard shows her jobs by stage. She submits a brief with every section, three deliverables and a reference link, and gets `DJI0143_Q1'27_Summer Holiday Sale` straight away (New Request)
3. **Traffic Manager (Chloe):** the dashboard shows the incoming count. In Incoming she opens the brief and asks for missing information (Awaiting Information)
4. **Zanele** answers from her dashboard (Awaiting Traffic Review)
5. **Chloe** allocates and schedules: Priya, 16h, planned start and expected completion. The booking is made, Priya goes from green to amber, and a warning shows if completion falls after the required date. The clash dialog still works (Scheduled)
6. **Designer (Priya):** the job is on her dashboard. She starts it (In Progress) and submits an artwork link, version 1 (Awaiting Design Approval)
7. **Head of Design (Naledi):** from the approval queue she sends it back with a comment (Design Changes Required). Priya submits version 2 and Naledi approves it (Awaiting Marketing Approval)
8. **Zanele** requests a change (a price change). This creates Revision 1, which goes to the Traffic Manager, not to the designer (Awaiting Revision Scheduling)
9. **Chloe** schedules the revision: Priya, 4h (Revision Scheduled). Priya works on it (Revision In Progress) and submits version 3; Naledi approves it
10. **Zanele** marks it as needing Sales approval (Awaiting Business Approval), records "Approved by Sales" with the date and a note (Approved / Ready to Close), and closes the job (Done). The job page shows the artwork versions, approvals, revision and history
11. **Head of Marketing (Megan):** the department dashboard, then Reports

### Role dashboards and navigation

Each role lands on its own dashboard. Reports is its own menu item for every role, scoped on the server.

| Role | Dashboard | Nav |
| --- | --- | --- |
| Head of Marketing | Total submitted, in progress, awaiting allocation, awaiting approval, awaiting feedback, overdue, completed; jobs by brand, by Marketing Manager and by designer; studio capacity; average turnaround; revision volumes. Filters: brand and period | Dashboard, Board, Schedule, Reports |
| Head of Design | Approval queue with Approve and Send back; in progress; requiring amendments; overdue; designer workloads; completed | Dashboard, Board, Schedule, Reports |
| Traffic Manager | Incoming queue; awaiting allocation; upcoming deadlines and overdue; not booked; capacity per designer | Dashboard, Incoming (count), Board, Schedule, Time off (count), Reports |
| Designer | Today's work, upcoming, in progress, awaiting approval, requiring changes, completed; my calendar and workload (from My work) | My dashboard, Board (own jobs), Reports |
| Marketing Manager | Submit a brief; jobs by stage: awaiting allocation, in progress, awaiting design approval, awaiting my approval, awaiting business approval, revisions requested, ready to close, closed; information requests to answer | My dashboard, My requests, New brief, Reports |

### Seed

Replaces D54. Org "The Core Group" with its 14 brands, prefixes and colours unchanged. One team, "Design Studio"; the Marketing team is removed. All names are fictional.

| Role | Users |
| --- | --- |
| Head of Marketing | Megan Botha |
| Head of Design | Naledi Khumalo |
| Traffic Manager | Chloe Adams |
| Designers (6) | Ethan Pillay, Lerato Mokoena, Amahle Dlamini, Ruben Fourie (5h/day), Priya Naidoo, Sipho Ndlovu |
| Marketing Managers (9) | Zanele Mthembu (DJI, Pure Electric), Pieter Smit (GoPro), Ayesha Moosa (Bambu Lab), Nicole Jacobs (MS Surface), Bongani Zulu (Ultra Human), Thabo Mahlangu (CORE, CGA), Lindiwe Khoza (InRetail, Reloved), Werner Steyn (ARP, CVM), Fatima Patel (Mobile in Africa, CCB) |

- Jason van Wyk leaves with the Marketing team
- About 30 open jobs, covering every status, some on revision 2
- The earlier briefs (D56) become closed jobs with approvals, events and close dates, so the reports have turnaround times
- `LastJobNumber` is set for each brand, so DJI's next job is 0143. Job numbering per brand is kept and never resets
- The load story stays: Lerato overloaded this week and next, Priya at 50% next week, two designers on leave, Ethan's pending leave. The sick-leave masking moves to a designer, because Thabo is now a Marketing Manager without a schedule

### Deferred to the MVP

- File uploads: working files, artwork files, preview and download (the demo uses artwork links)
- Notifications, email and in-app, beyond the nav counts
- Comment threads: replies, tags, attachments
- A searchable audit screen for the whole organisation, and export. Each job's own history list is in the demo, because CD5 gives Marketing Managers its full history
- Reopening a closed job (Option 1) and a new job linked to the original (Option 2)
- Head of Marketing overrides: submit on behalf, allocate, close
- User and permission management screen
- Configurable naming convention (11.2)
- Designers flagging blockers, and the "Internal Review" designer status (3.3)
- The rest of section 9 reporting: time per stage, reasons for delays, designer performance
- Advanced search with date ranges
- External calendar, and deadlines on the calendar (11.6)
- Marketing Managers seeing their brands' jobs (open question 1)
- Bookings by time of day

## 5. Pending items

| Item | Status | Where it fits |
| --- | --- | --- |
| Booking actions on cards: Book on schedule when unbooked; View on schedule and Add booking when booked; Add booking hidden at or above the estimate (D59, C.15) | Built, awaiting review | "Book on schedule" is **superseded** by Allocate and schedule, which makes the booking. "View on schedule" and "Add booking" (hidden at or above the estimate) **stay** for the Traffic Manager in the job drawer (W.1) |
| Booked indicator and "Not booked" board filter (D57, C.13) | Built | **Fits.** The chip stays on job cards for the Head of Marketing, Head of Design and Traffic Manager. "Not booked" becomes a board filter and a Traffic Manager dashboard card, mainly for revisions waiting to be scheduled |
| Multi-select people filter on the schedule (D60, C.16) | Built, awaiting review | **Fits unchanged** for the three roles who see the schedule |
| Task and booking colours by brand, with a key (D61, C.17) | Built, awaiting review | **Fits.** Jobs and bookings take their brand's colour; the key stays under Board and Schedule |
| Reference links on requests | Not built | **Fits** as brief section E: `JobLink` (J.4) |
| Briefs report moving under Reports (D56) | Built, under Dashboard | **Fits.** Reports becomes its own menu item, scoped by role (V.6) |
| Brand managers approve on the board (D58, C.14) | Built, awaiting review | **Superseded.** Marketing Managers have no board, and their approval comes after the Head of Design's (W.5) |
| C.18 rehearsal of the Phase C script | Open | **Superseded** by the new script. Proposed: close Phase C once the user agrees |

## 6. Phases

One commit per step. Each phase ends with a stop for review.

**Phase R: Requirements and gap analysis**

- R.1 This document, and `docs/requirements.md` committed
- R.2 `docs/plan.md`: client decisions, new phases, deferred items

**Phase J: Roles and jobs**

- J.1 Roles as org data (D77): `Capability` in code, `Role` per org and `User.RoleId`; access by capability; org terms and settings; login grouped by the org's roles; nav and landing from capabilities; seed of The Core Group's five roles and 18 users in one studio; migration `Roles`. **Done.**
- J.2 Jobs replace requests, projects and tasks: `Job`, `JobEvent`, `Allocation.JobId`; `BoardColumn`, `JobStatus` and `WorkflowTransition` as org data, read by `JobWorkflow`. Board columns and status chips from the data, with brand colours, booked chip and filters, and no drag between columns. Job visibility by capability. Seed of The Core Group's statuses, columns, workflow and jobs, including the closed history. Dashboard and report moved onto jobs. Migration `Jobs`. **Done.**
- J.3 Job number from `Department.LastJobNumber` at submission, in the org's format (`Organisation.JobCodeFormat`); the code never changes; migration `JobNumbers`. **Done.**
- J.4 Brief form sections A to F, deliverables with type, specs and deadline, supporting links; job page for the Marketing Manager; migration `BriefSections`

**Phase W: Workflow**

- W.1 Traffic Manager: Incoming (replaces Triage), Brief complete, Allocate and schedule (makes the booking; clash, leave and deadline warnings), View on schedule, Add booking, reassign and reschedule
- W.2 Request information and the answer (Awaiting Information, Awaiting Traffic Review)
- W.3 Designer: own jobs only, Start, Submit artwork link (`JobArtwork` versions); no Schedule in the nav
- W.4 Head of Design: approval queue, Approve and Send back (`JobApproval`)
- W.5 Marketing Manager: Approve, Needs business approval, Record business approval, Close
- W.6 Revisions: Request changes creates a `JobRevision` that goes to the Traffic Manager and is scheduled, worked and approved; revision badge on the card; the job page lists versions, approvals, revisions and history

**Phase V: Views and demo**

- V.1 Marketing Manager dashboard; My requests with search
- V.2 Traffic Manager dashboard
- V.3 Head of Design dashboard
- V.4 Designer dashboard (from My work)
- V.5 Head of Marketing dashboard
- V.6 Reports menu item; briefs report moved and scoped by role
- V.7 Board text search; nav count badges
- V.8 `docs/demo-brief.md` script and seed table, README, rehearsal on freshly reset data, screenshots

## 7. Open questions

For the client unless noted.

1. CD5: may a Marketing Manager see jobs submitted by others for the brands they manage, for example when covering leave? The demo says no
2. Can the Traffic Manager reject or cancel a brief? Answered: yes, with a required reason; the job is kept as Cancelled (D75)
3. Is Marketing Changes Required a status a job rests in, or only the decision recorded on the approval (the demo's approach)?
4. Job ID quarter: from the required completion date (today's rule, D52) or the date briefed? Either way the ID never changes after submission
5. Does Scheduled belong in In Design (proposed) or Incoming? Answered: In Design (D76)
6. Who approves designer leave: the Traffic Manager (demo), the Head of Design, or both?
7. Do the Head of Design or Traffic Manager do design work, and so need capacity on the schedule? The demo says no
8. What are the job categories (3.1A, 9.1 "Jobs by category")?
9. Can a business approval come back as "changes required" and start a revision? The demo says yes
10. What is each brand's current last job number, to set `LastJobNumber` at go-live?
11. Calendar integration: in-app only, or Outlook or ICS?
12. Deliverable deadlines: does the job's required date drive the schedule, with deliverable dates for information only?
13. For the user: `docs/design-reference.png` is deleted in the working tree but `CLAUDE.md` still points to it. Answered: restored
