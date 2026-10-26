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
