import { HttpClient } from '@angular/common/http';
import { Injectable, inject, resource } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { AcceptRequest, CreateRequest, Person, Project, RequestOptions, WorkRequest } from './models';
import { TeamContextService } from './team-context.service';

/** Work intake: the request form, and the triage inbox with its nav badge. */
@Injectable({ providedIn: 'root' })
export class RequestsService {
  private readonly http = inject(HttpClient);
  private readonly teamContext = inject(TeamContextService);

  /**
   * New requests waiting in the current team's triage inbox, newest first, for Team Admins. The nav badge and
   * the triage page share it, so reloading it after an accept or reject refreshes both.
   */
  readonly inbox = resource({
    params: () => (this.teamContext.isTeamAdmin() ? this.teamContext.teamId() : undefined),
    loader: ({ params }) =>
      firstValueFrom(this.http.get<WorkRequest[]>(`/api/teams/${params}/requests`, { params: { status: 'New' } })),
  });

  options(): Promise<RequestOptions> {
    return firstValueFrom(this.http.get<RequestOptions>('/api/requests/options'));
  }

  create(request: CreateRequest): Promise<WorkRequest> {
    return firstValueFrom(this.http.post<WorkRequest>('/api/requests', request));
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

  accept(id: string, accept: AcceptRequest): Promise<WorkRequest> {
    return firstValueFrom(this.http.post<WorkRequest>(`/api/requests/${id}/accept`, accept));
  }

  reject(id: string, reason: string): Promise<WorkRequest> {
    return firstValueFrom(this.http.post<WorkRequest>(`/api/requests/${id}/reject`, { reason }));
  }
}
