import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { DueDate } from '../../shared/due-date';
import { StatusChip } from '../../shared/status-chip';
import { JobActionArea } from '../workflow/job-action-area';

/**
 * The jobs waiting for the signed-in user to approve (D70): the head of design's designs, or a marketing manager's
 * artwork once the design is approved. Each shows the latest artwork to review and the actions the user may take.
 */
@Component({
  selector: 'app-approvals-page',
  imports: [DueDate, JobActionArea, RouterLink, StatusChip],
  template: `
    <div class="px-8 pt-2 pb-8">
      <h1 class="page-title">Approvals</h1>
      <p class="mt-1 text-sm text-ink-muted">
        @if (approvals.hasValue()) {
          {{ approvals.value().length }} waiting
        }
      </p>

      @if (approvals.error()) {
        <p class="empty-state mt-6 text-over-700">
          The queue could not be loaded. Refresh the page to try again.
        </p>
      } @else if (approvals.hasValue()) {
        <ul class="mt-6 space-y-4">
          @for (item of approvals.value(); track item.job.id) {
            @let job = item.job;
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
              </div>
              <h2 class="mt-2 font-display text-base font-semibold">{{ job.title }}</h2>
              <p class="mt-1 text-sm text-ink-muted">
                @if (job.designerName) {
                  {{ job.designerName }} &middot;
                }
                from {{ job.requesterName }}
                @if (job.deadline; as required) {
                  &middot; due
                  <app-due-date [date]="required" [overdue]="job.isOverdue" format="EEE d MMM" />
                }
              </p>
              <p class="mt-3 text-sm">
                <a class="btn-quiet -ml-3" [routerLink]="['/requests', job.id]">Brief and activity</a>
              </p>
              <app-job-action-area class="mt-4" [job]="job" />
            </li>
          } @empty {
            <li class="empty-state">Nothing waiting for your approval.</li>
          }
        </ul>
      } @else {
        <p class="empty-state mt-6">Loading the queue...</p>
      }
    </div>
  `,
})
export class ApprovalsPage {
  protected readonly auth = inject(AuthService);

  /** Shared with the nav badge, so both refresh together. */
  protected readonly jobs = inject(JobsService);
  protected readonly approvals = this.jobs.approvals;
}
