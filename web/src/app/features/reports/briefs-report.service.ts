import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BriefsReport } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class BriefsReportService {
  private readonly http = inject(HttpClient);

  /** The team's briefs report, for one brand (department) id, or every brand when it is empty. */
  get(teamId: string, departmentId: string): Promise<BriefsReport> {
    const params = departmentId ? { departmentId } : undefined;
    return firstValueFrom(this.http.get<BriefsReport>(`/api/teams/${teamId}/reports/briefs`, { params }));
  }
}
