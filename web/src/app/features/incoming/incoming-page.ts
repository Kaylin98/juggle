import { DatePipe } from '@angular/common';
import { Component, inject, resource } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { Priority } from '../../core/models';
import { TeamContextService } from '../../core/team-context.service';
import { StatusChip } from '../../shared/status-chip';
import { JobActions } from '../workflow/job-actions';

const PRIORITY_PILL: Record<Priority, string> = {
  Urgent: 'bg-over-50 text-over-700',
  High: 'bg-warn-50 text-warn-700',
  Medium: 'bg-surface-muted text-ink-muted',
  Low: 'bg-surface-muted text-ink-muted',
};

/**
 * The team's incoming queue, newest first, for users who triage briefs (D76): briefs to review, ready to allocate, and
 * revisions to schedule. Each job offers the actions the user may take on it: request information, mark the brief
 * complete, allocate and schedule, or cancel.
 */
@Component({
  selector: 'app-incoming-page',
  imports: [DatePipe, JobActions, StatusChip],
  template: `
    <div class="px-8 pt-2 pb-8">
      <h1 class="page-title">Incoming</h1>
      <p class="mt-1 text-sm text-ink-muted">
        {{ teamContext.team()?.name }} team
        @if (incoming.hasValue()) {
          &middot; {{ incoming.value().length }} waiting
        }
      </p>

      @if (incoming.error()) {
        <p class="empty-state mt-6 text-over-700">
          The queue could not be loaded. Refresh the page to try again.
        </p>
      } @else if (incoming.hasValue()) {
        <ul class="mt-6 space-y-4">
          @for (job of incoming.value(); track job.id) {
            <li class="panel p-6">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="flex items-center gap-2 text-xs text-ink-muted"
                  [style.--hue]="job.colour"
                >
                  <span class="hue-dot size-2 shrink-0 rounded-full"></span>
                  {{ job.code }}
                </span>
                <app-status-chip [name]="job.statusName" [colour]="job.statusColour" />
                <span
                  class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  [class]="priorityPill[job.priority]"
                >
                  {{ job.priority }}
                </span>
              </div>
              <h2 class="mt-2 font-display text-base font-semibold">{{ job.title }}</h2>
              <p class="mt-1 text-sm text-ink-muted">
                From {{ job.requesterName }} &middot; briefed in
                {{ job.createdAt | date: 'EEE d MMM, HH:mm' }}
                @if (job.requiredDate; as required) {
                  &middot; required
                  <span class="font-semibold text-ink">{{ required | date: 'EEE d MMM' }}</span>
                }
                @if (job.designerName; as designer) {
                  &middot; {{ designer }}
                }
              </p>
              @if (job.purpose) {
                <p class="mt-3 line-clamp-2 text-sm">{{ job.purpose }}</p>
              }
              @if (job.deliverables.length) {
                <ul class="mt-3 flex flex-wrap gap-2" aria-label="Deliverables">
                  @for (deliverable of job.deliverables; track $index) {
                    <li class="rounded-full bg-surface-muted px-3 py-1 text-xs">
                      {{ deliverable.description }}
                    </li>
                  }
                </ul>
              }
              <app-job-actions
                class="mt-4 block empty:hidden"
                [job]="job"
                [people]="people.value() ?? []"
                (changed)="incoming.reload()"
              />
            </li>
          } @empty {
            <li class="empty-state">
              Nothing waiting. New {{ auth.terms().brief.toLowerCase() }}s for this team show up
              here.
            </li>
          }
        </ul>
      } @else {
        <p class="empty-state mt-6">Loading the queue...</p>
      }
    </div>
  `,
})
export class IncomingPage {
  protected readonly auth = inject(AuthService);
  protected readonly teamContext = inject(TeamContextService);

  /** Shared with the nav badge, so both refresh together. */
  private readonly jobs = inject(JobsService);
  protected readonly incoming = this.jobs.incoming;

  /** The team's people, for Allocate and schedule. */
  protected readonly people = resource({
    params: () => this.teamContext.teamId() ?? undefined,
    loader: ({ params }) => this.jobs.people(params),
  });

  protected readonly priorityPill = PRIORITY_PILL;
}
