import { HttpClient } from '@angular/common/http';
import { Injectable, inject, resource } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import {
  AllocateJob,
  AllocatedJob,
  CreateJob,
  Job,
  JobDetail,
  JobOptions,
  Person,
  Workflow,
} from './models';
import { TeamContextService } from './team-context.service';

/** Jobs (D68): the brief form and the user's own jobs, the organisation's workflow, and the incoming queue. */
@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly teamContext = inject(TeamContextService);

  /**
   * The current team's incoming queue, newest first, for users who triage briefs. The nav badge and the Incoming page share
   * it, so reloading it refreshes both.
   */
  readonly incoming = resource({
    params: () => (this.auth.can('TriageBriefs') ? this.teamContext.teamId() : undefined),
    loader: ({ params }) => firstValueFrom(this.http.get<Job[]>(`/api/teams/${params}/incoming`)),
  });

  /** The organisation's board columns and statuses (D77). */
  workflow(): Promise<Workflow> {
    return firstValueFrom(this.http.get<Workflow>('/api/workflow'));
  }

  options(): Promise<JobOptions> {
    return firstValueFrom(this.http.get<JobOptions>('/api/jobs/options'));
  }

  submit(brief: CreateJob): Promise<JobDetail> {
    return firstValueFrom(this.http.post<JobDetail>('/api/jobs', brief));
  }

  /** The jobs the signed-in user sent the brief for, newest first. */
  mine(): Promise<Job[]> {
    return firstValueFrom(this.http.get<Job[]>('/api/jobs/mine'));
  }

  /** A job with its whole brief. */
  get(id: string): Promise<JobDetail> {
    return firstValueFrom(this.http.get<JobDetail>(`/api/jobs/${id}`));
  }

  /** The team's people, whom Allocate and schedule books. */
  people(teamId: string): Promise<Person[]> {
    return firstValueFrom(this.http.get<Person[]>(`/api/teams/${teamId}/people`));
  }

  requestInformation(id: string, message: string): Promise<JobDetail> {
    return firstValueFrom(
      this.http.post<JobDetail>(`/api/jobs/${id}/request-information`, { message }),
    );
  }

  answer(id: string, message: string): Promise<JobDetail> {
    return firstValueFrom(this.http.post<JobDetail>(`/api/jobs/${id}/answer`, { message }));
  }

  start(id: string): Promise<JobDetail> {
    return firstValueFrom(this.http.post<JobDetail>(`/api/jobs/${id}/start`, {}));
  }

  submitArtwork(id: string, url: string, note: string | null): Promise<JobDetail> {
    return firstValueFrom(
      this.http.post<JobDetail>(`/api/jobs/${id}/submit-artwork`, { url, note }),
    );
  }

  markReady(id: string): Promise<JobDetail> {
    return firstValueFrom(this.http.post<JobDetail>(`/api/jobs/${id}/mark-ready`, {}));
  }

  /** Books the designer and schedules the job. */
  allocate(id: string, allocation: AllocateJob): Promise<AllocatedJob> {
    return firstValueFrom(this.http.post<AllocatedJob>(`/api/jobs/${id}/allocate`, allocation));
  }

  cancel(id: string, reason: string): Promise<JobDetail> {
    return firstValueFrom(this.http.post<JobDetail>(`/api/jobs/${id}/cancel`, { message: reason }));
  }

  /** The team's jobs the user may see: all of them with ViewAllJobs, otherwise their own (D70). */
  teamJobs(teamId: string): Promise<Job[]> {
    return firstValueFrom(this.http.get<Job[]>(`/api/teams/${teamId}/jobs`));
  }
}
