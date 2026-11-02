import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, resource, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import {
  AllocateJob,
  AllocatedJob,
  BusinessApproval,
  CreateJob,
  Job,
  FileKind,
  JobDetail,
  JobFile,
  JobOptions,
  Person,
  QueuedJob,
  RequestChanges,
  Workflow,
} from './models';
import { TeamContextService } from './team-context.service';

/**
 * Reloads the resource whenever a job changes anywhere (see JobsService.notifyChanged), so every screen that shows
 * jobs, the nav counts included, follows an action without a refresh. Call it where the resource is created.
 */
export function reloadOnJobChange(
  data: { reload(): boolean },
  jobs: { changes: () => number } = inject(JobsService),
): void {
  let seen = jobs.changes();
  effect(() => {
    const now = jobs.changes();
    if (now === seen) return;
    seen = now;
    untracked(() => data.reload());
  });
}

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

  /**
   * The jobs waiting for the signed-in user to approve, with the artwork to review. The nav badge and the Approvals
   * page share it, so reloading it refreshes both.
   */
  readonly approvals = resource({
    params: () =>
      this.auth.can('ApproveDesign') || this.auth.can('ApproveMarketing') ? true : undefined,
    loader: () => firstValueFrom(this.http.get<QueuedJob[]>('/api/jobs/approvals')),
  });

  /** Counts the changes made to jobs in this session; the screens showing jobs reload when it moves. */
  readonly changes = signal(0);

  constructor() {
    reloadOnJobChange(this.incoming, this);
    reloadOnJobChange(this.approvals, this);
  }

  /** Something was done to a job (an action, a booking, a file): tells every screen showing jobs to reload. */
  notifyChanged(): void {
    this.changes.update((n) => n + 1);
  }

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

  approveDesign(id: string, comment: string | null): Promise<JobDetail> {
    return firstValueFrom(this.http.post<JobDetail>(`/api/jobs/${id}/approve-design`, { comment }));
  }

  sendBack(id: string, comment: string): Promise<JobDetail> {
    return firstValueFrom(this.http.post<JobDetail>(`/api/jobs/${id}/send-back`, { comment }));
  }

  approveMarketing(id: string, comment: string | null): Promise<JobDetail> {
    return firstValueFrom(
      this.http.post<JobDetail>(`/api/jobs/${id}/approve-marketing`, { comment }),
    );
  }

  needsBusinessApproval(id: string, message: string): Promise<JobDetail> {
    return firstValueFrom(
      this.http.post<JobDetail>(`/api/jobs/${id}/needs-business-approval`, { message }),
    );
  }

  recordBusinessApproval(id: string, approval: BusinessApproval): Promise<JobDetail> {
    return firstValueFrom(
      this.http.post<JobDetail>(`/api/jobs/${id}/record-business-approval`, approval),
    );
  }

  close(id: string): Promise<JobDetail> {
    return firstValueFrom(this.http.post<JobDetail>(`/api/jobs/${id}/close`, {}));
  }

  requestChanges(id: string, changes: RequestChanges): Promise<JobDetail> {
    return firstValueFrom(this.http.post<JobDetail>(`/api/jobs/${id}/request-changes`, changes));
  }

  start(id: string): Promise<JobDetail> {
    return firstValueFrom(this.http.post<JobDetail>(`/api/jobs/${id}/start`, {}));
  }

  submitArtwork(id: string, url: string, note: string | null): Promise<JobDetail> {
    return firstValueFrom(
      this.http.post<JobDetail>(`/api/jobs/${id}/submit-artwork`, { url, note }),
    );
  }

  /** Submits a file as the next version of the artwork. */
  submitArtworkFile(id: string, file: File, note: string | null): Promise<JobDetail> {
    const body = new FormData();
    body.append('file', file);
    if (note) body.append('note', note);
    return firstValueFrom(this.http.post<JobDetail>(`/api/jobs/${id}/submit-artwork-file`, body));
  }

  /** Attaches a file to the job: its brief document or supporting material. */
  attach(id: string, kind: FileKind, file: File): Promise<JobFile> {
    const body = new FormData();
    body.append('kind', kind);
    body.append('file', file);
    return firstValueFrom(this.http.post<JobFile>(`/api/jobs/${id}/files`, body));
  }

  /** Where a file downloads from; `inline` opens an image or PDF in the browser instead. */
  fileUrl(jobId: string, fileId: string, inline = false): string {
    return `/api/jobs/${jobId}/files/${fileId}${inline ? '?inline=true' : ''}`;
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
