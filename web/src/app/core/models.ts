// Types matching the API DTOs.

/** What a role allows (D77). Pages and actions are shown from these, never from a role's name. */
export type Capability =
  | 'SubmitBrief'
  | 'TriageBriefs'
  | 'Allocate'
  | 'ViewSchedule'
  | 'WorkOnJobs'
  | 'ApproveDesign'
  | 'ApproveMarketing'
  | 'CloseJob'
  | 'ViewAllJobs'
  | 'ViewBoard'
  | 'ViewReports'
  | 'ApproveTimeOff'
  | 'ManageUsers';

export interface DemoUser {
  id: string;
  name: string;
  avatarColour: string;
  /** The name of the user's role in their organisation. */
  role: string;
  jobTitle: string | null;
  /** The brands the user manages, by name (D58). */
  departments: string[];
  teams: string[];
}

/** The organisation's words for its concepts, such as "Brand", "Brief" and "Job" (D48, D77). */
export interface Terms {
  department: string;
  brief: string;
  job: string;
}

export interface Me {
  id: string;
  name: string;
  email: string;
  avatarColour: string;
  /** The name of the user's role in their organisation. */
  role: string;
  capabilities: Capability[];
  personId: string | null;
  terms: Terms;
  /** The brands the user manages (D58). */
  managedDepartmentIds: string[];
}

export interface Team {
  id: string;
  name: string;
  colour: string;
}

/** Whether a job in a status is still open, done, or cancelled (left out of completed counts, D75). */
export type JobStatusKind = 'Open' | 'Done' | 'Cancelled';

/** One of the organisation's detailed statuses (D69, D77), with one of the 8 palette hues for its chip. */
export interface JobStatus {
  id: string;
  name: string;
  colour: string;
  kind: JobStatusKind;
}

/** A board column and its statuses, in order. */
export interface BoardColumn {
  id: string;
  name: string;
  statuses: JobStatus[];
}

/** One step of the workflow: taking the action on a job in the from status leads to the to status. */
export interface WorkflowStep {
  action: WorkflowAction;
  fromStatusId: string;
  toStatusId: string;
}

/** The organisation's board (D64, D77). */
export interface Workflow {
  columns: BoardColumn[];
  /** The statuses Allocate and schedule leads to, whose cards show "Starts <date>" (D76). */
  scheduledStatusIds: string[];
  /** Where each action can be taken from and where it leads (D74). */
  steps: WorkflowStep[];
}

export interface Person {
  id: string;
  name: string;
  avatarColour: string;
  jobTitle: string;
  hoursPerDay: number;
}

/** The workflow actions (D77). The API offers a job only those its status and the user's role allow. */
export type WorkflowAction =
  | 'RequestInformation'
  | 'Answer'
  | 'MarkReady'
  | 'Cancel'
  | 'AllocateAndSchedule'
  | 'Start'
  | 'SubmitForApproval'
  | 'ApproveDesign'
  | 'SendBack'
  | 'ApproveMarketing'
  | 'NeedsBusinessApproval'
  | 'RecordBusinessApproval'
  | 'RequestChanges'
  | 'Close';

/** A job: a brief from its marketing manager, with its job ID, status and designer (D68). */
export interface Job {
  id: string;
  teamId: string;
  teamName: string;
  /** The job ID, fixed when the brief was sent (D63). */
  code: string;
  title: string;
  departmentId: string;
  department: string;
  /** The brand's colour, which its cards and bookings take (D61). */
  colour: string;
  requesterName: string;
  statusId: string;
  /** The board column its status is in. */
  columnId: string;
  statusName: string;
  statusColour: string;
  statusKind: JobStatusKind;
  priority: Priority;
  requiredDate: string | null;
  /** The earliest of the required date and the deliverables' deadlines; overdue and due checks use it. */
  deadline: string | null;
  /** When the brief was sent: the date briefed. */
  createdAt: string;
  /** What the artwork is for (section 3.1B). */
  purpose: string | null;
  /** Section 3.1C, in the order given. */
  deliverables: BriefDeliverable[];
  designerPersonId: string | null;
  designerName: string | null;
  estimateHours: number | null;
  plannedStartDate: string | null;
  expectedCompletionDate: string | null;
  /** Open and the required date has passed. */
  isOverdue: boolean;
  /** Open and required within the next 7 days, or overdue (D57). */
  isDueSoon: boolean;
  /** Open and still in Incoming or In Design, so it can be booked on the schedule. */
  acceptsBookings: boolean;
  /** The hours of all its bookings, on the person's working days. */
  bookedHours: number;
  /** Its bookings, earliest first. */
  bookings: JobBooking[];
  /** The workflow actions the signed-in user may take on it now (D70). */
  actions: WorkflowAction[];
  /** How many rounds of changes have been asked for after the first submission. */
  revisionCount: number;
}

export interface JobBooking {
  personId: string;
  personName: string;
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  hours: number;
}

export interface DayLoad {
  date: string;
  capacity: number;
  allocated: number;
  /** Why the day is not worked (leave, a public holiday), or null on a working day. */
  timeOff: string | null;
  /** The day is a public holiday; timeOff is then its name. */
  publicHoliday: boolean;
  /** Leave waiting for approval on a working day; it does not reduce capacity (D17). */
  pendingTimeOff: string | null;
}

export interface SchedulePerson {
  id: string;
  name: string;
  avatarColour: string;
  jobTitle: string;
  hoursPerDay: number;
  days: DayLoad[];
}

export interface Allocation {
  id: string;
  personId: string;
  jobId: string;
  /** The job ID, which the bar shows. */
  jobCode: string;
  /** The job's brand colour (D61). */
  colour: string;
  department: string;
  /** The team that owns the job. */
  teamName: string;
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  notes: string | null;
  /** The job belongs to another team; shown greyed. */
  otherTeam: boolean;
}

export interface Schedule {
  days: string[];
  people: SchedulePerson[];
  allocations: Allocation[];
}

/** Creates or replaces an allocation. Dates are inclusive. */
export interface SaveAllocation {
  personId: string;
  jobId: string;
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  notes: string | null;
}

/** Allocate and schedule: the designer, the booking that schedules them (dates inclusive), and the estimate. */
export interface AllocateJob {
  personId: string;
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  estimateHours: number;
}

/** What a booking would run into, before it is saved. */
export interface AllocationCheck {
  clashDays: string[];
  leaveDays: string[];
  /** The job's earliest deadline; null when it has none. */
  deadline: string | null;
  /** The person's working days between the deadline and the end of the booking. */
  workingDaysLate: number;
  /** The person's working days from the start to the deadline, inclusive. */
  workingDaysToDeadline: number;
}

export interface CheckAllocation {
  jobId: string;
  personId: string;
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  /** The booking being moved or resized, which the check leaves out. */
  exceptAllocationId?: string;
}

/** The hours a person has free over some days. */
export interface PersonAvailability {
  personId: string;
  freeHours: number;
}

/** A job just scheduled, with what its booking ran into. */
export interface AllocatedJob {
  job: JobDetail;
  clashDays: string[];
  leaveDays: string[];
  /** The booking ends after the date the job is required. */
  afterRequiredDate: boolean;
}

/** A stakeholder's approval, recorded by the marketing manager: who decided, when, a note and the evidence (CD4). */
export interface BusinessApproval {
  stakeholderName: string;
  decidedOn: string;
  note: string | null;
  link: string | null;
}

/** Changes asked for after the artwork was submitted. A stakeholder's decision also says who and when. */
export interface RequestChanges {
  reason: string;
  changes: string | null;
  revisedRequiredDate: string | null;
  link: string | null;
  stakeholderName: string | null;
  decidedOn: string | null;
}

export interface SavedAllocation extends SaveAllocation {
  id: string;
  /** Days of this allocation on which the person is now booked over capacity (D16). */
  clashDays: string[];
  /** Days of this allocation on which the person is on approved leave. */
  leaveDays: string[];
}

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Option {
  id: string;
  name: string;
}

export interface TeamOption extends Option {
  colour: string;
}

/** What the brief form offers. The brand defaults to the first brand the user manages (D58). */
export interface JobOptions {
  teams: TeamOption[];
  departments: Option[];
  priorities: Priority[];
  categories: JobCategory[];
  deliverableTypes: DeliverableType[];
  myDepartmentId: string | null;
}

/** The kind of job (section 3.1A); a placeholder list until the client gives theirs (open question 8). */
export type JobCategory =
  | 'Campaign'
  | 'ProductLaunch'
  | 'Promotion'
  | 'RetailAndInStore'
  | 'DigitalAndSocial'
  | 'Event'
  | 'Corporate'
  | 'Other';

/** The kinds of deliverable in section 3.1C, and Other. */
export type DeliverableType =
  | 'SocialMedia'
  | 'WebsiteBanner'
  | 'Email'
  | 'DigitalAdvertising'
  | 'Print'
  | 'InStore'
  | 'ProductArtwork'
  | 'KeyVisual'
  | 'Presentation'
  | 'Packaging'
  | 'Other';

/** B. Brief objectives. */
export interface BriefObjectives {
  purpose: string | null;
  objective: string | null;
  targetAudience: string | null;
  keyMessage: string | null;
  channels: string | null;
  expectedOutcome: string | null;
}

/** C. One required deliverable, with its own specifications and deadline. */
export interface BriefDeliverable {
  type: DeliverableType;
  description: string;
  specifications: string | null;
  dueDate: string | null;
}

/** D. Creative guidelines. */
export interface CreativeGuidelines {
  creativeDirection: string | null;
  brandRequirements: string | null;
  coloursAndTypography: string | null;
  designReferences: string | null;
  mandatoryMessaging: string | null;
  requiredLogos: string | null;
  productImagery: string | null;
  legalDisclaimers: string | null;
  creativeInstructions: string | null;
}

/** E. Supporting material: a link with a label. */
export interface BriefLink {
  url: string;
  label: string | null;
}

/** The parts of the brief (section 3.1) that are not on the job itself. */
export interface Brief {
  campaign: string | null;
  category: JobCategory | null;
  /** The job ID of the job this brief revises; null for a new job. */
  revisesJobCode: string | null;
  objectives: BriefObjectives;
  guidelines: CreativeGuidelines;
  links: BriefLink[];
  additionalInformation: string | null;
}

/** A job and its whole brief, for its own page. */
/** A version of the artwork submitted for approval (D72). */
export interface Artwork {
  version: number;
  url: string;
  note: string | null;
  submittedByName: string;
  submittedAt: string;
}

export type ApprovalStage = 'Design' | 'Marketing' | 'Business';
export type ApprovalDecision = 'Approved' | 'ChangesRequested';

/** An approval decision on the artwork (D72). */
export interface Approval {
  stage: ApprovalStage;
  decision: ApprovalDecision;
  /** The artwork version reviewed. */
  version: number | null;
  reviewerName: string;
  recordedAt: string;
  comment: string | null;
  /** Business approval only: who decided, the day they decided, and a link to the evidence. */
  stakeholderName: string | null;
  decidedOn: string | null;
  link: string | null;
}

/** A round of changes asked for after the artwork was submitted (D72). */
export interface Revision {
  number: number;
  source: 'Marketing' | 'Business';
  requestedByName: string;
  requestedAt: string;
  reason: string;
  changes: string | null;
  revisedRequiredDate: string | null;
  link: string | null;
  /** Who the traffic manager scheduled to make them; null until scheduled. */
  designerName: string | null;
  estimateHours: number | null;
  /** When the head of design approved the revised design. */
  completedAt: string | null;
}

/** A job waiting for the signed-in user's approval, with the artwork to review. */
export interface QueuedJob {
  job: Job;
  artwork: Artwork | null;
}

/** Something done to a job, by whom and when (D72). */
export interface JobEvent {
  at: string;
  action: WorkflowAction | 'Submit' | 'Reassign' | 'Reschedule';
  userName: string;
  /** The status the action left the job in. */
  toStatusName: string;
  /** What the user wrote with it, such as a question or the reason for cancelling. */
  message: string | null;
}

export interface JobDetail {
  job: Job;
  brief: Brief;
  /** Every action taken on the job, oldest first. */
  history: JobEvent[];
  /** The versions submitted, oldest first. The user who briefed the job sees none until the design is approved. */
  artwork: Artwork[];
  /** The approval decisions on the artwork, oldest first. */
  approvals: Approval[];
  /** The rounds of changes asked for, oldest first. */
  revisions: Revision[];
}

/** A brief in the client's template, sections A to F (J.4). The signed-in user sends it (D67). */
export interface CreateJob {
  teamId: string;
  departmentId: string;
  /** The job name. */
  title: string;
  campaign: string | null;
  category: JobCategory | null;
  revisesJobCode: string | null;
  requiredDate: string | null;
  priority: Priority;
  objectives: BriefObjectives;
  deliverables: BriefDeliverable[];
  guidelines: CreativeGuidelines;
  links: BriefLink[];
  additionalInformation: string | null;
}

/** Booked and available hours over a period; capacity is 0 when the person has no working days in it. */
export interface PeriodLoad {
  allocated: number;
  capacity: number;
}

export interface PersonUtilisation {
  id: string;
  name: string;
  avatarColour: string;
  jobTitle: string;
  thisWeek: PeriodLoad;
  /** The four weeks after this one. */
  nextFourWeeks: PeriodLoad;
  /** At least one day this week is booked over capacity. */
  overThisWeek: boolean;
}

export interface TeamCount {
  teamId: string;
  teamName: string;
  count: number;
}

export interface DepartmentCount {
  department: string;
  count: number;
}

export interface Dashboard {
  people: PersonUtilisation[];
  /** One entry per team shown, so "All teams" can link to each team. */
  overdueJobs: TeamCount[];
  /** Jobs waiting for an approval (D53, D77). */
  awaitingApproval: TeamCount[];
  /** Jobs in the incoming queue. */
  incoming: TeamCount[];
  /** Open jobs by brand, most first. */
  workByDepartment: DepartmentCount[];
}

export interface ColumnCount {
  columnId: string;
  name: string;
  /** Every status in the column is done or cancelled, so its jobs count as completed. */
  done: boolean;
  count: number;
}

export interface DesignerCount {
  /** Null for the jobs with no designer yet. */
  personId: string | null;
  name: string | null;
  /** Jobs per column id; columns with none are left out. */
  counts: Record<string, number>;
}

export interface MonthCount {
  /** The first day of the month. */
  month: string;
  count: number;
}

/** The briefs report (D56), for every brand or one. Cancelled jobs are left out (D75). */
export interface BriefsReport {
  /** The brands with jobs in the team, for the brand filter; the same whatever the filter. */
  brands: Option[];
  /** Jobs per board column, in board order. */
  byColumn: ColumnCount[];
  /** Everyone in the team, the most open jobs first, then jobs with no designer. */
  byDesigner: DesignerCount[];
  /** Briefs sent to the team in each of the last 9 months, oldest first. */
  receivedByMonth: MonthCount[];
}

export type TimeOffType =
  'AnnualLeave' | 'SickLeave' | 'FamilyResponsibility' | 'StudyLeave' | 'Other';
export type TimeOffStatus = 'Pending' | 'Approved' | 'Declined';

/** The signed-in person's own time off; cancelled requests are left out. */
export interface MyTimeOff {
  id: string;
  type: TimeOffType;
  label: string;
  status: TimeOffStatus;
  startDate: string;
  endDate: string;
  /** Weekdays in the range that are not public holidays. */
  workingDays: number;
  note: string | null;
  declineReason: string | null;
}

/** Asks for time off for the signed-in person. Dates are inclusive. */
export interface RequestTimeOff {
  type: TimeOffType;
  startDate: string;
  endDate: string;
  note: string | null;
}

/** A pending request, for one of the person's team admins or an Org Admin. */
export interface TimeOffApproval {
  id: string;
  personId: string;
  personName: string;
  avatarColour: string;
  jobTitle: string;
  /** The person's teams, by name. */
  teams: string[];
  label: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  note: string | null;
}

/** The signed-in person's work across all their teams. */
export interface MyWork {
  person: Person;
  /** Open jobs they are the designer of: overdue first, then by required date, undated last. */
  jobs: Job[];
  /** Each weekday of this week and next week. */
  days: DayLoad[];
  /** Bookings on those days, in every team. */
  bookings: Allocation[];
  /** Pending, approved and declined leave that has not ended yet, earliest first. */
  timeOff: MyTimeOff[];
}
