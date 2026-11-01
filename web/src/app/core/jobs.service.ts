import { HttpClient } from '@angular/common/http';
import { Injectable, inject, resource } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { CreateJob, Job, JobDetail, JobOptions, Workflow } from './models';
import { TeamContextService } from './team-context.service';

/** Jobs (D68): the brief form and the user's own jobs, the organisation's workflow, and the incoming queue. */
@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly teamContext = inject(TeamContextService);

  /**
   * The current team's incoming queue, newest first, for users who triage. The nav badge and the triage page share
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

  /** The team's jobs the user may see: all of them with ViewAllJobs, otherwise their own (D70). */
  teamJobs(teamId: string): Promise<Job[]> {
    return firstValueFrom(this.http.get<Job[]>(`/api/teams/${teamId}/jobs`));
  }
}
