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
