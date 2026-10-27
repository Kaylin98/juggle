import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Schedule } from '../../core/models';

export type Weeks = 1 | 2 | 4;

@Injectable({ providedIn: 'root' })
export class CapacityService {
  private readonly http = inject(HttpClient);

  /** The schedule for a team id, or "all" for every team (Org Admin only). */
  get(teamId: string, start: string, weeks: Weeks): Promise<Schedule> {
    return firstValueFrom(
      this.http.get<Schedule>('/api/capacity', { params: { teamId, start, weeks } }),
    );
  }
}
