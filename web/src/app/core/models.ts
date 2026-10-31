// Types matching the API DTOs.

export type OrgRole = 'OrgAdmin' | 'User';
export type TeamRole = 'TeamAdmin' | 'Member';
export type RoleLabel = 'Org Admin' | 'Team Admin' | 'Member' | 'Requester';

export interface DemoUser {
  id: string;
  name: string;
  avatarColour: string;
  role: RoleLabel;
  jobTitle: string | null;
  department: string | null;
  teams: string[];
}

export interface Me {
  id: string;
  name: string;
  email: string;
  avatarColour: string;
  orgRole: OrgRole;
  personId: string | null;
  /** What the organisation calls departments, such as "Brand" (D48). */
  departmentLabel: string;
}

export interface Team {
  id: string;
  name: string;
  colour: string;
  myRole: TeamRole;
}

export type StatusCategory = 'Todo' | 'InProgress' | 'Review' | 'Done';

export interface WorkflowStatus {
  id: string;
  name: string;
  order: number;
  category: StatusCategory;
}

export interface Project {
  id: string;
  name: string;
  colour: string;
  department: string;
}

export interface Person {
  id: string;
  name: string;
  avatarColour: string;
  jobTitle: string;
  hoursPerDay: number;
}

export interface Task {
  id: string;
  projectId: string;
  statusId: string;
  title: string;
  description: string | null;
  assigneePersonId: string | null;
  estimateHours: number | null;
  dueDate: string | null;
  isOverdue: boolean;
  reviewCycle: number;
  sortOrder: number;
  link: string | null;
}

/** A task added from the board. With no status it goes in the first column after Triage. */
export interface CreateTask {
  title: string;
  projectId: string;
  statusId: string | null;
  assigneePersonId: string | null;
  estimateHours: number | null;
  dueDate: string | null;
  link: string | null;
}

export interface UpdateTask {
  title: string;
  description: string | null;
  assigneePersonId: string | null;
  estimateHours: number | null;
  dueDate: string | null;
  link: string | null;
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
  projectId: string;
  projectName: string;
  projectColour: string;
  projectDepartment: string;
  /** The team that owns the project. */
  teamName: string;
  taskId: string | null;
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  notes: string | null;
  /** The project belongs to another team; shown greyed. */
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
  projectId: string;
  taskId: string | null;
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  notes: string | null;
}

export interface SavedAllocation extends SaveAllocation {
  id: string;
  /** Days of this allocation on which the person is now booked over capacity (D16). */
  clashDays: string[];
  /** Days of this allocation on which the person is on approved leave. */
  leaveDays: string[];
}

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type RequestStatus = 'New' | 'Accepted' | 'Rejected';

export interface Option {
  id: string;
  name: string;
}

export interface TeamOption extends Option {
  colour: string;
}

export interface UserOption extends Option {
  avatarColour: string;
}

/**
 * What the request form offers. Any team can be asked for work; the department defaults to the user's own.
 * Marketing managers are the users with a department, and the user.
 */
export interface RequestOptions {
  teams: TeamOption[];
  departments: Option[];
  marketingManagers: UserOption[];
  priorities: Priority[];
  myDepartmentId: string | null;
}

/** A brief, in the studio's template (D50). */
export interface WorkRequest {
  id: string;
  teamId: string;
  teamName: string;
  /** The job name. */
  title: string;
  mainGoal: string | null;
  /** One per line as typed, without empty lines or bullets. */
  deliverables: string[];
  department: string;
  requesterName: string;
  marketingManagerName: string | null;
  /** The studio deadline. */
  requestedDueDate: string | null;
  priority: Priority;
  status: RequestStatus;
  taskId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  /** Once accepted: who does the work, from the task (it follows reassignment). */
  assigneeName: string | null;
  /** Once accepted: the task's due date, which the team committed to. */
  committedDueDate: string | null;
}

export interface CreateRequest {
  teamId: string;
  title: string;
  mainGoal: string | null;
  /** One per line. */
  deliverables: string | null;
  departmentId: string;
  marketingManagerUserId: string;
  requestedDueDate: string | null;
  priority: Priority;
}

/**
 * Turns a request into work, with who does it, the estimate and the committed due date: into an existing project
 * (`projectId`, one task) or as a new brief (`newProjectName`, one task per deliverable), never both (D51).
 */
export interface AcceptRequest {
  projectId: string | null;
  newProjectName: string | null;
  assigneePersonId: string | null;
  estimateHours: number | null;
  dueDate: string | null;
}

/** What accepting as a new brief proposes: the next job code (null when the department has no prefix) and colour. */
export interface NewBrief {
  projectName: string | null;
  colour: string;
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
  overdueTasks: TeamCount[];
  triageRequests: TeamCount[];
  /** Open tasks by their project's department, most first. */
  workByDepartment: DepartmentCount[];
}

/** A task assigned to the signed-in person, with what My work shows of its team, project and status. */
export interface MyTask {
  task: Task;
  teamId: string;
  teamName: string;
  projectName: string;
  projectColour: string;
  projectDepartment: string;
  statusName: string;
  category: StatusCategory;
}

export type TimeOffType = 'AnnualLeave' | 'SickLeave' | 'FamilyResponsibility' | 'StudyLeave' | 'Other';
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
  /** Open tasks: overdue first, then by due date, undated last. */
  tasks: MyTask[];
  /** Each weekday of this week and next week. */
  days: DayLoad[];
  /** Bookings on those days, in every team. */
  bookings: Allocation[];
  /** Pending, approved and declined leave that has not ended yet, earliest first. */
  timeOff: MyTimeOff[];
}
