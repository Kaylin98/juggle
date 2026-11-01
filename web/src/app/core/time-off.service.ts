import { HttpClient } from '@angular/common/http';
import { Injectable, inject, resource } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { MyTimeOff, RequestTimeOff, TimeOffApproval } from './models';

/** Time off requests (D47): asking for your own, and approving or declining other people's. */
@Injectable({ providedIn: 'root' })
export class TimeOffService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  /**
   * Requests waiting for the viewer's decision, earliest first. The nav badge and the approvals page share it,
   * so reloading it after a decision refreshes both.
   */
  readonly approvals = resource({
    params: () => (this.auth.can('ApproveTimeOff') ? this.auth.me()?.id : undefined),
    loader: () => firstValueFrom(this.http.get<TimeOffApproval[]>('/api/time-off/approvals')),
  });

  request(request: RequestTimeOff): Promise<MyTimeOff> {
    return firstValueFrom(this.http.post<MyTimeOff>('/api/time-off', request));
  }

  cancel(id: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`/api/time-off/${id}/cancel`, {}));
  }

  approve(id: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`/api/time-off/${id}/approve`, {}));
  }

  decline(id: string, reason: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`/api/time-off/${id}/decline`, { reason }));
  }
}
