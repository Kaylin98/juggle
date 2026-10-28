import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { Project, Schedule } from '../../core/models';

export type Weeks = 1 | 2 | 4 | 8;

@Injectable({ providedIn: 'root' })
export class CapacityService {
  private readonly http = inject(HttpClient);

  /** The schedule for a team id, or "all" for every team (Org Admin only). */
  get(teamId: string, start: string, weeks: Weeks): Promise<Schedule> {
    return firstValueFrom(
      this.http.get<Schedule>('/api/capacity', { params: { teamId, start, weeks } }),
    );
  }

  /** The projects that can be booked from the schedule: one team's, or every team's on "All teams". */
  async projects(teamIds: string[]): Promise<Project[]> {
    const perTeam = await firstValueFrom(forkJoin(teamIds.map((id) => this.http.get<Project[]>(`/api/teams/${id}/projects`))));
    return perTeam.flat();
  }
}
