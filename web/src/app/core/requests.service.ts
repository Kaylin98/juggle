import { HttpClient } from '@angular/common/http';
import { Injectable, inject, resource } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { AuthService } from './auth.service';
import { AcceptRequest, CreateRequest, NewBrief, Person, Project, RequestOptions, WorkRequest } from './models';
import { TeamContextService } from './team-context.service';

/** Work intake: the request form and the user's own requests, and the triage inbox with its nav badge. */
@Injectable({ providedIn: 'root' })
export class RequestsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly teamContext = inject(TeamContextService);

  /**
   * New requests waiting in the current team's triage inbox, newest first, for users who triage. The nav badge and
   * the triage page share it, so reloading it after an accept or reject refreshes both.
   */
  readonly inbox = resource({
    params: () => (this.auth.can('TriageBriefs') ? this.teamContext.teamId() : undefined),
    loader: ({ params }) =>
      firstValueFrom(this.http.get<WorkRequest[]>(`/api/teams/${params}/requests`, { params: { status: 'New' } })),
  });

  options(): Promise<RequestOptions> {
    return firstValueFrom(this.http.get<RequestOptions>('/api/requests/options'));
  }

  create(request: CreateRequest): Promise<WorkRequest> {
    return firstValueFrom(this.http.post<WorkRequest>('/api/requests', request));
  }

  /** The signed-in user's own requests, newest first. */
  mine(): Promise<WorkRequest[]> {
    return firstValueFrom(this.http.get<WorkRequest[]>('/api/requests/mine'));
  }

  get(id: string): Promise<WorkRequest> {
    return firstValueFrom(this.http.get<WorkRequest>(`/api/requests/${id}`));
  }

  /** The team's projects and people, to choose from when accepting. */
  acceptOptions(teamId: string): Promise<{ projects: Project[]; people: Person[] }> {
    return firstValueFrom(
      forkJoin({
        projects: this.http.get<Project[]>(`/api/teams/${teamId}/projects`),
        people: this.http.get<Person[]>(`/api/teams/${teamId}/people`),
      }),
    );
  }

  /** The job code and colour a new brief from this request would get (D51). */
  newBrief(id: string): Promise<NewBrief> {
    return firstValueFrom(this.http.get<NewBrief>(`/api/requests/${id}/new-brief`));
  }

  accept(id: string, accept: AcceptRequest): Promise<WorkRequest> {
    return firstValueFrom(this.http.post<WorkRequest>(`/api/requests/${id}/accept`, accept));
  }

  reject(id: string, reason: string): Promise<WorkRequest> {
    return firstValueFrom(this.http.post<WorkRequest>(`/api/requests/${id}/reject`, { reason }));
  }
}
