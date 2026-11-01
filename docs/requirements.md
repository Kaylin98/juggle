**MARKETING &  
DESIGN STUDIO**

Organisational App  
Functional Requirements & Scope

| **Prepared for**         | Software Development Team          |
|--------------------------|------------------------------------|
| **Department**           | Marketing                          |
| **Reference platforms**  | Monday.com, Resource Guru and Jira |
| **User base / location** | 18 users \| South Africa           |

# Client decisions (1 November 2026)

These answers from the client take precedence over the original text below where they differ.

1. **Traffic Manager.** The role exists today and is a separate role in the app. The Traffic Manager reviews every new brief, requests missing information, estimates effort, allocates the designer and owns the schedule. Designers cannot assign or book work for themselves.
2. **Job ID and naming.** The job ID is the Monday-style name: `<BRAND CODE><per-brand number>_<Quarter>'<YY>_<job name>`, for example `DJI0143_Q1'27_Summer Holiday Sale`. The number counts per brand since the brand started and never resets. The quarter follows the financial year, which starts in October. This replaces the `MKT-2026-0001` example in section 11.1.
3. **Board columns.** The board has five columns: Incoming, In Design, In Review, With Marketing, Done. Each column groups several of the detailed statuses in section 6. The detailed status is shown on each card and drives permissions, notifications and reporting.
4. **Sales and business approval.** Sales and other stakeholders do not get logins. The Marketing Manager records the outcome on the job (for example "Approved by Sales", the date, and an optional note, link or attachment).
5. **Marketing Manager access (clarified).**
   - Can see: only the jobs they submitted, with status, assigned designer, expected completion date, comments, artwork and full history. Reports on their own requests only.
   - Can do: submit briefs; respond to requests for information; review artwork only after Head of Design approval; approve, request changes (routed to the Traffic Manager) or record business approval; close jobs; request a reopen or create a linked new job; receive notifications.
   - Cannot: see the Studio board, the resource planner, designer workloads or capacity, or other Marketing Managers' jobs; allocate or contact designers about allocation; upload artwork or approve design quality.
   - Navigation: My dashboard (submit a brief, jobs grouped by stage such as Awaiting my approval), My requests, Reports (own data only). No Board or Schedule.
   - **Open question:** should a Marketing Manager also see jobs submitted by others for the brands they manage (for example when covering leave)? Until answered, access is limited to jobs they submitted.
6. **Requester.** The requester is always the logged-in Marketing Manager. There is no "Requested by" field for normal use. Submitting on someone's behalf is an administrative override only (section 10) and is deferred.

# Document purpose

This document outlines the Marketing Department's structure, the way the Marketing and Design Studio teams currently manage creative requests through Monday.com, and the functional requirements for a new internal organisational application.

The proposed application should combine the job and workflow management capabilities of Monday.com, the resource scheduling and capacity-planning capabilities of Resource Guru, and the task tracking, revision history and accountability features of Jira.

It is intended to give the developer a clear understanding of the users, permissions, end-to-end workflow, approval hierarchy, resource-management requirements and reporting needs.

# 1. Project overview

## 1.1 Purpose of the application

The objective is to develop an internal organisational and workflow management application for the Marketing and Design Studio teams. The application should centralise all creative requests, design briefs, job allocation, resource management, timelines, approvals, feedback, revisions and completed artwork.

The primary workflow should ensure that Marketing Managers submit structured requests; the Traffic Manager reviews and allocates work; Designers execute the work; the Head of Design approves creative output; and Marketing Managers obtain any additional business approvals before formally closing jobs.

## 1.2 Core principles

- All creative requests must be submitted and tracked in one centralised system.

- The Traffic Manager controls day-to-day job allocation and designer scheduling.

- The Head of Design is the final approval authority within the Design Studio.

- The Marketing Manager owns the brief, business requirements, stakeholder approvals and final job closure.

- The system must provide visibility of designer capacity, workload and deadlines.

- All revisions must be linked to the original job and retain a complete history.

- Every important action, approval, comment and status change must be traceable to a user.

- The system must support reopening completed jobs without overwriting historical records.

# 2. Organisational structure and user roles

There are currently 18 users who will require access to the application.

| **Role**           | **Users** | **Access requirement**                                            |
|--------------------|-----------|-------------------------------------------------------------------|
| Head of Marketing  | 1         | Full administrative access across the department                  |
| Head of Design     | 1         | Full Design Studio access and final creative approval             |
| Traffic Manager    | 1         | Full operational access to job management and resource allocation |
| Designers          | 6         | Individual workspaces and Kanban boards                           |
| Marketing Managers | 9         | Creative request submission and tracking                          |

## 2.1 Head of Marketing – 1 user

Role: Oversees the entire Marketing Department, including Marketing Managers and the Design Studio.

Access required: Full administrative access.

- View all jobs submitted by Marketing Managers and all jobs allocated to Designers.

- Access all designer workspaces, workloads, briefs, artwork, comments, attachments and revision histories.

- View the Traffic Manager's allocations, schedules and capacity planning.

- Monitor outstanding, overdue, completed and pending-approval jobs.

- View job priorities, workload distribution and department-wide performance.

- Intervene in workflows where necessary and manage users and permissions.

- Access reporting dashboards and departmental analytics.

The Head of Marketing needs visibility across the entire operation without having to manage individual jobs on a daily basis.

## 2.2 Head of Design – 1 user

Role: Oversees the six Designers and is responsible for the quality and approval of all creative work.

Access required: Full Design Studio access.

- View all incoming and allocated jobs, designer workloads and deadlines.

- Access briefs, creative guidelines and supporting material.

- Review completed artwork and provide feedback.

- Approve or reject artwork and return it to Designers for revisions.

- Monitor individual Designer performance and output.

- Access the complete history of each job.

Approval rule: No artwork may progress to the Marketing Manager for sign-off until it has been approved by the Head of Design.

## 2.3 Traffic Manager – 1 user

Role: Controls the workflow and allocation of all creative jobs.

Access required: Full operational access.

- Receive and review all new creative requests.

- Check briefs for completeness and request missing information.

- Assess complexity and estimated time required.

- Determine priorities and allocate work based on availability, capacity, skills and existing workload.

- Set planned start dates and expected completion dates.

- Schedule Designers' daily workloads and monitor progress.

- Reallocate or reschedule jobs when required.

- Manage incoming revisions and amendments.

- Monitor overdue jobs, scheduling conflicts and bottlenecks.

Control rule: Marketing Managers must not allocate work directly to Designers. All new requests and revisions are routed through the Traffic Manager.

## 2.4 Designers – 6 users

Role: Execute creative work assigned by the Traffic Manager.

Access required: Individual Designer workspace and Kanban board.

- View assigned jobs, briefs, deadlines, priorities and supporting files.

- View creative guidelines, brand CI and reference material.

- Update job progress and status.

- Upload draft and completed artwork.

- Add comments, ask questions and flag missing information.

- Submit completed artwork for Head of Design review.

- View their own workload and scheduled tasks.

Designers must not independently allocate jobs to themselves or other Designers, and must not bypass the Head of Design approval process. The Head of Design, Traffic Manager and Head of Marketing should have visibility across all Designer workspaces.

## 2.5 Marketing Managers – 9 users

Role: Initiate creative requests and manage business requirements and approvals for their respective brands or projects.

Access required: Request submission and job tracking.

- Create and submit new creative briefs.

- Upload supporting documents, artwork links and brand guidelines.

- Specify required completion dates, objectives, priorities and deliverables.

- Track the status of submitted jobs and view the assigned Designer and expected completion date.

- Receive notifications when jobs progress.

- Review artwork after Head of Design approval.

- Provide feedback and request amendments.

- Upload revised instructions or additional supporting material.

- Confirm final acceptance and close jobs once all approvals are obtained.

- View the history of their own submitted requests.

Marketing Managers should not have access to Designer scheduling, resource allocation or other users' private workspaces. They should generally only manage and track jobs they have submitted, unless additional access is granted.

# 3. Standard creative request workflow

The application must support a controlled workflow from the initial brief through to final job closure.

## 3.1 Stage 1 – Creative brief submission

Initiated by: Marketing Manager \| Received by: Traffic Manager

When a Marketing Manager requires creative work, they submit a formal request through a centralised briefing form. The system should automatically record the submission date and time and generate a unique job reference number.

### A. Job information

- Job title and approved naming convention

- Brand or business unit

- Campaign or project name

- Marketing Manager submitting the request

- Date briefed (automatically generated)

- Required completion date

- Priority level

- Job category or type

- New job or revision of an existing job

### B. Brief objectives

- Purpose of the artwork

- Campaign or communication objective

- Target audience

- Key message

- Intended platforms or channels

- Expected outcome

### C. Required deliverables

The form must allow multiple deliverables to be added to one brief. Each deliverable may have its own dimensions, specifications and deadline.

- Social media artwork, including posts and stories

- Website banners

- Email marketing designs

- Digital advertising assets

- Print artwork

- In-store promotional material

- Product artwork

- Campaign key visuals

- Presentation layouts

- Packaging or product-related artwork

### D. Creative guidelines

- Creative direction

- Brand identity and CI requirements

- Colours and typography

- Design references

- Mandatory messaging

- Required logos

- Product imagery

- Legal disclaimers

- Additional creative instructions

### E. Supporting material

- Existing artwork

- Brand guidelines

- Creative reference images

- Product images

- Campaign documents

- Copywriting and approved messaging

- SharePoint, Google Drive or other cloud-storage links

- Other supporting material

### F. Additional information

Include a free-text section for any additional context or instructions that may help the Designer.

Submission rule: Once submitted, the request automatically enters the Traffic Manager's incoming job queue. The Marketing Manager receives confirmation of submission.

## 3.2 Stage 2 – Traffic Manager review and allocation

Responsible: Traffic Manager

The Traffic Manager reviews the brief, confirms that the information is sufficient, assesses the estimated effort and priority, checks Designer availability, and allocates the job.

1.  Review the complete brief and supporting material.

2.  Request clarification from the Marketing Manager if information is missing.

3.  Assess complexity and estimated design time.

4.  Determine priority and scheduling requirements.

5.  Review the availability and capacity of all six Designers.

6.  Allocate the job to the most suitable Designer.

7.  Assign a planned start date and estimated completion date.

8.  Add the job to the Designer's schedule.

The resource-planning interface should show each Designer, assigned jobs, daily workload, estimated hours, available capacity and upcoming deadlines. The Traffic Manager should be able to move jobs between Designers or dates and receive warnings about scheduling conflicts or over-allocation.

Once allocated, the Designer receives a notification and the job appears in their workspace. The Marketing Manager receives confirmation of allocation and the expected completion date.

## 3.3 Stage 3 – Design execution

Responsible: Allocated Designer

- Open the allocated job and review the full brief.

- Access all supporting information and creative references.

- View the deadline, priority and scheduled work period.

- Update job status and record progress.

- Add internal comments or queries.

- Upload working files or draft artwork.

- Flag missing information or blockers.

- Submit completed artwork for Head of Design review.

Designers should not need separate email threads for standard job updates. Relevant communication should be recorded against the job.

Suggested Designer statuses: Not Started; In Progress; Awaiting Information; Internal Review; Submitted for Approval; Revision Required; Completed.

## 3.4 Stage 4 – Head of Design approval

Responsible: Head of Design

The Head of Design receives a notification when artwork is submitted. The approval interface should allow the Head of Design to preview and download artwork, compare it against the brief, add comments, approve or reject it, and request amendments.

Outcome A – Approved: The artwork progresses to the Marketing Manager for review.

Outcome B – Changes required: The artwork returns to the assigned Designer with feedback. The job cannot progress to Marketing Manager approval until the Head of Design approves it.

The system must record the reviewer, date and time, decision, comments, requested changes and artwork version reviewed.

## 3.5 Stage 5 – Marketing Manager review and business approval

Responsible: Marketing Manager

Once the Head of Design approves the artwork, the Marketing Manager receives a notification and reviews it against the original brief.

Outcome A – Approved, no further approval required: The Marketing Manager confirms that the artwork is correct and ready for use. The job can proceed to closure.

Outcome B – Sales or stakeholder approval required: The Marketing Manager marks the job as 'Awaiting Business Approval'. The Marketing Manager remains responsible for obtaining approval. The system should allow feedback, comments, supporting documents and the approval decision to be recorded. Sales does not necessarily need full application access in the initial release.

Outcome C – Changes required: The Marketing Manager submits a revision request through the application, including specific changes, clear feedback, supporting references, updated artwork links where relevant, and any revised deadlines or campaign requirements.

## 3.6 Stage 6 – Revisions and amendments

Responsible: Marketing Manager and Traffic Manager

Revisions are a regular part of the creative process. A revision must not be sent directly from the Marketing Manager to the Designer. It must return to the Traffic Manager for review and scheduling.

9.  Marketing Manager submits a revision request.

10. The request is routed to the Traffic Manager.

11. The Traffic Manager reviews the changes and assesses the additional work required.

12. The Traffic Manager determines when the revision can be scheduled.

13. The Traffic Manager allocates the revision to the relevant Designer.

14. The Designer implements the changes.

15. The revised artwork is submitted to the Head of Design.

16. Once approved, the artwork returns to the Marketing Manager.

17. The Marketing Manager approves it or requests further revisions.

The system must distinguish between a new creative job, a revision to an existing job, and a new request relating to a previously completed job.

Each revision must be linked to the original job reference and retain: revision number; date requested; person requesting the revision; reason and description of changes; allocated Designer; completion date; and approval history. The original brief and previous artwork versions must remain accessible.

## 3.7 Stage 7 – Final approval and job closure

Responsible: Marketing Manager

Once the artwork has received Head of Design approval and all required business approvals have been obtained, the Marketing Manager can close the job.

- Confirm that the artwork meets the original requirements.

- Confirm that all requested revisions have been implemented.

- Confirm that all necessary approvals have been obtained.

- Accept the final artwork and close the job.

The job status changes to CLOSED / COMPLETED. The final approved artwork remains accessible in the job record. The system records the final approval date, person who closed the job, final artwork version, total time taken, number of revisions, and complete communication and approval history.

# 4. Reopening closed jobs

A job may be completed and closed, but a later request may arise to change certain elements. The application must support this without losing the original job history.

Examples include a product price change, campaign date extension, replacement product image, disclaimer update, additional size or format, stakeholder request, or a change to previously approved messaging.

## Option 1 – Reopen the existing job

For minor amendments directly related to the original job, the Marketing Manager should be able to request that the job be reopened. The Traffic Manager reviews the request and decides when it can be scheduled. The job then follows the normal revision and approval workflow.

## Option 2 – Create a new job linked to the original

For substantial changes, new deliverables or a new campaign requirement, the Marketing Manager should be able to create a new job and link it to the previous job reference.

Critical rule: Closing a job must not permanently lock it. Historical versions and approvals must never be overwritten or deleted when a job is reopened.

# 5. Required application interfaces

## 5.1 Head of Marketing dashboard

- Total jobs submitted

- Jobs in progress

- Jobs awaiting allocation

- Jobs awaiting approval

- Jobs awaiting feedback

- Overdue jobs

- Completed jobs

- Jobs by brand or Marketing Manager

- Jobs by Designer

- Overall Design Studio capacity

- Average turnaround time

- Revision volumes

- Workload distribution

Filters should include date range, brand, Marketing Manager, Designer, priority and job status.

## 5.2 Head of Design dashboard

- All incoming and allocated jobs

- Jobs currently in progress

- Jobs awaiting design approval

- Jobs requiring amendments

- Overdue jobs

- Individual Designer workloads

- Daily and weekly schedules

- Completed jobs

- Dedicated approval queue

## 5.3 Traffic Manager dashboard

This is one of the most important interfaces. It should function as a combined job-management board and resource-scheduling tool.

- Incoming job queue: all new briefs submitted by Marketing Managers.

- Resource planner: calendar or timeline showing all six Designers and their allocated jobs.

- Kanban board: visual view of jobs moving through workflow stages.

- Job allocation: ability to assign, reassign and schedule jobs.

- Capacity planning: available hours versus allocated hours for each Designer.

- Deadline monitoring: upcoming deadlines, overdue jobs and scheduling conflicts.

## 5.4 Designer dashboard

- My Jobs

- Today's Tasks

- Upcoming Jobs

- Jobs In Progress

- Jobs Awaiting Approval

- Jobs Requiring Changes

- Completed Jobs

- My Calendar

- My Workload

Designers should be able to switch between Kanban and calendar views.

## 5.5 Marketing Manager dashboard

- Submit New Brief

- My Active Jobs

- Awaiting Allocation

- In Progress

- Awaiting Design Approval

- Awaiting My Approval

- Awaiting Sales / Business Approval

- Revisions Requested

- Completed Jobs

- Closed Jobs

Each submitted job should show its progress, allocated Designer, expected completion date, comments and uploaded artwork.

# 6. Job status system

Use standardised statuses across the application. The overall job status should be distinguishable from internal approval status.

| **Status**                   | **Meaning**                                         |
|------------------------------|-----------------------------------------------------|
| New Request                  | Brief submitted by Marketing Manager                |
| Awaiting Traffic Review      | Traffic Manager needs to assess the brief           |
| Awaiting Information         | Additional details required from Marketing          |
| Awaiting Allocation          | Brief reviewed and ready to be scheduled            |
| Scheduled                    | Job allocated with a planned start date             |
| In Progress                  | Designer actively working on the job                |
| Awaiting Design Approval     | Submitted to Head of Design                         |
| Design Changes Required      | Head of Design has requested amendments             |
| Awaiting Marketing Approval  | Head of Design has approved the artwork             |
| Awaiting Business Approval   | Marketing Manager is obtaining stakeholder approval |
| Marketing Changes Required   | Marketing Manager has requested amendments          |
| Awaiting Revision Scheduling | Revision submitted to Traffic Manager               |
| Revision Scheduled           | Revision allocated to a Designer                    |
| Revision In Progress         | Designer implementing requested changes             |
| Approved / Ready to Close    | All required approvals obtained                     |
| Closed / Completed           | Marketing Manager has formally closed the job       |

# 7. Designer resource and capacity management

The application should incorporate Resource Guru-style functionality. The Traffic Manager must be able to see the availability and workload of all six Designers in one place.

- Individual Designer calendars.

- Daily, weekly and monthly views.

- Job allocation by date and time.

- Estimated hours per job.

- Available working hours and total allocated hours.

- Over-capacity warnings.

- Deadline conflict alerts.

- Ability to move jobs between Designers.

- Ability to reschedule jobs.

- View of completed versus outstanding work.

The system should support South African working days and public holidays and use the South African time zone (SAST / Africa/Johannesburg). It must accommodate annual leave, sick leave, public holidays and other periods of Designer unavailability.

Recommended: Record estimated effort against each job, rather than relying only on the number of jobs allocated. Several simple social media adaptations may require less time than one complex campaign.

# 8. Notifications and communication

Automated notifications should reduce unnecessary emails and manual follow-ups.

| **Event**                          | **Notification recipient**     |
|------------------------------------|--------------------------------|
| New brief submitted                | Traffic Manager                |
| Additional information requested   | Marketing Manager              |
| Job allocated                      | Designer and Marketing Manager |
| Job scheduled or deadline changed  | Designer and Marketing Manager |
| Job status updated                 | Relevant Marketing Manager     |
| Artwork submitted for approval     | Head of Design                 |
| Artwork approved by Head of Design | Marketing Manager              |
| Artwork rejected by Head of Design | Designer and Traffic Manager   |
| Revision requested by Marketing    | Traffic Manager                |
| Revision allocated                 | Designer and Marketing Manager |
| Final artwork uploaded             | Head of Design                 |
| Job ready for closure              | Marketing Manager              |
| Job closed                         | Relevant stakeholders          |

Each job should have its own comment and activity section. Users should be able to add comments, reply, tag relevant users, upload supporting documents and view timestamps. Communication should remain attached to the relevant job.

# 9. Reporting and performance analytics

## 9.1 Departmental reporting

- Total jobs received per month

- Total jobs completed per month

- Total outstanding jobs

- Jobs by Marketing Manager

- Jobs by brand or business unit

- Jobs by category

- Average turnaround time

## 9.2 Designer performance

- Jobs allocated per Designer

- Jobs completed per Designer

- Average time taken per job

- Number of overdue jobs

- Number of revisions per job

- Workload distribution

- Available versus allocated capacity

## 9.3 Workflow performance

- Time from brief submission to allocation

- Time from allocation to commencement

- Time from commencement to design completion

- Time spent awaiting approval

- Number of revisions per job

- Jobs awaiting Marketing feedback

- Jobs awaiting Sales approval

- Reasons for delays

# 10. System rules and access control

The application must use role-based access control. The following matrix describes the intended default permissions. Administrative overrides may be granted to the Head of Marketing, but normal workflows should still follow the designated approval process.

| **Functionality**              | **Head of Marketing** | **Head of Design** | **Traffic Manager** | **Designer** | **Marketing Manager** |
|--------------------------------|-----------------------|--------------------|---------------------|--------------|-----------------------|
| View all jobs                  | Yes                   | Yes                | Yes                 | No           | No                    |
| Submit creative briefs         | Yes\*                 | Yes\*              | Yes\*               | No           | Yes                   |
| Review incoming briefs         | Yes                   | Yes                | Yes                 | No           | No                    |
| Allocate Designers             | Yes\*                 | Yes\*              | Yes                 | No           | No                    |
| Manage schedules               | Yes\*                 | Yes\*              | Yes                 | No           | No                    |
| View all Designer workloads    | Yes                   | Yes                | Yes                 | No           | No                    |
| View own allocated jobs        | Yes                   | Yes                | Yes                 | Yes          | Yes                   |
| Upload artwork                 | Yes\*                 | Yes\*              | Yes\*               | Yes          | No                    |
| Approve design work            | No                    | Yes                | No                  | No           | No                    |
| Request revisions              | Yes\*                 | Yes                | Yes\*               | No           | Yes                   |
| Approve final business artwork | Yes\*                 | No                 | No                  | No           | Yes                   |
| Close jobs                     | Yes\*                 | No                 | No                  | No           | Yes                   |
| View reporting                 | Yes                   | Yes                | Yes                 | Own activity | Own requests          |
| Manage user permissions        | Yes                   | No                 | No                  | No           | No                    |

\*Administrative override only. The standard workflow and designated approval responsibilities should remain in place.

# 11. Additional functional requirements

## 11.1 Unique job reference numbers

Every submitted brief should automatically generate a unique job ID. The ID remains the same throughout the job lifecycle, including revisions. Format: see Client decisions, item 2 (for example `DJI0143_Q1'27_Summer Holiday Sale`).

## 11.2 Naming convention

The system should enforce an approved naming convention so that jobs are identifiable and searchable. The naming convention should be configurable by an administrator.

## 11.3 File and artwork management

- Original brief

- Supporting documents

- Creative references

- Working files

- Draft artwork

- Revised artwork

- Final approved artwork

Different artwork versions must be retained and clearly identifiable.

## 11.4 Search and filters

- Job reference number

- Job title

- Brand

- Campaign

- Marketing Manager

- Designer

- Date submitted

- Deadline

- Job status

## 11.5 Audit trail

Record all important actions automatically, including who submitted the brief, allocated the job, changed the deadline or status, uploaded artwork, approved or rejected artwork, requested revisions and closed the job. Each action must include a timestamp.

## 11.6 Calendar integration

Provide a central calendar showing scheduled jobs, Designer availability, upcoming deadlines, approval deadlines, overdue jobs, leave and public holidays.

# 12. Suggested application navigation

18. Dashboard – role-specific overview.

19. Job Requests – all submitted creative briefs.

20. Traffic Management – incoming jobs and allocation.

21. Resource Planner – Designer capacity and scheduling.

22. Design Studio – Designer workspaces and Kanban boards.

23. Approvals – Head of Design approval queue.

24. Marketing Review – artwork awaiting Marketing feedback.

25. Revisions – outstanding and scheduled amendments.

26. Completed Jobs – approved and closed work.

27. Reports & Analytics – performance and operational reporting.

28. Settings & Users – user management, permissions and system configuration.

# 13. Recommended development phases

## Phase 1 – Core job management

- User accounts and permissions

- Marketing brief submission form

- Traffic Manager job queue

- Designer allocation

- Individual Designer dashboards

- Kanban boards

- Standard job statuses

- Artwork uploads

- Head of Design approval

- Marketing Manager approval and job closure

## Phase 2 – Resource and workflow management

- Resource Guru-style scheduling

- Designer capacity planning

- Daily and weekly workload calendars

- Automated notifications

- Revision management

- Job reopening

- Version control

- Sales/business approval tracking

## Phase 3 – Reporting and advanced functionality

- Departmental dashboards

- Designer performance reporting

- Turnaround time reporting

- Workload analytics

- Advanced search and filtering

- Calendar integration

- Additional workflow automation

# 14. Overall expectation

The ultimate goal is to create an application that gives the Marketing Department and Design Studio complete visibility and control over the creative production process.

Marketing Managers need a simple, structured way to brief the Design Studio and track requests. The Traffic Manager needs to manage incoming work, allocate resources and control the daily workflow. Designers need a clear view of their responsibilities, priorities and deadlines. The Head of Design needs oversight and final creative approval authority. The Head of Marketing needs complete visibility across the department, including workloads, deadlines, productivity and performance.

The application should eliminate fragmented communication, informal job requests, unclear deadlines and uncertainty around who is responsible for the next action.

**Desired outcome:** A centralised creative operations platform that manages the entire lifecycle of a design job, from the initial Marketing brief through design execution, approvals, revisions and final delivery.

# 15. Key design recommendation

The application should have two separate but connected control systems:

1\. Job management – who owns the job, what stage it is at, and what needs to happen next.

2\. Resource management – which Designer is doing the work, when they are doing it, and whether they have capacity.

These systems should work together but should not be treated as the same thing. This distinction is important to making the platform more useful than simply recreating a Monday.com board.

Before full development begins, it is recommended that the developer creates a clickable prototype of the five role-specific dashboards and the complete job journey. The team should test the workflow from a Marketing Manager's initial brief through to final job closure before the application architecture is finalised.
