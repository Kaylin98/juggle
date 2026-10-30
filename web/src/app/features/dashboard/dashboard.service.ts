import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Dashboard } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  /** The dashboard for a team id, or "all" for every team (Org Admin only). */
  get(teamId: string): Promise<Dashboard> {
    return firstValueFrom(this.http.get<Dashboard>('/api/dashboard', { params: { teamId } }));
  }
}
