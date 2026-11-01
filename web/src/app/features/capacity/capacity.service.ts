import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { Job, Schedule } from '../../core/models';

export type Weeks = 1 | 2 | 4 | 8;

@Injectable({ providedIn: 'root' })
export class CapacityService {
  private readonly http = inject(HttpClient);

  /** The schedule for a team id, or "all" for every team (ViewAllJobs only). */
  get(teamId: string, start: string, weeks: Weeks): Promise<Schedule> {
    return firstValueFrom(
      this.http.get<Schedule>('/api/capacity', { params: { teamId, start, weeks } }),
    );
  }

  /** The open jobs that can be booked from the schedule: one team's, or every team's on "All teams". */
  async openJobs(teamIds: string[]): Promise<Job[]> {
    const perTeam = await firstValueFrom(forkJoin(teamIds.map((id) => this.http.get<Job[]>(`/api/teams/${id}/jobs`))));
    return perTeam.flat().filter((job) => job.statusKind === 'Open');
  }
}
