import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { DueDate } from '../../shared/due-date';
import { StatusChip } from '../../shared/status-chip';
import { ToastService } from '../../shared/toast.service';
import { ActionRunner } from '../workflow/action-runner';
import { JobActionArea } from '../workflow/job-action-area';

/**
 * The jobs waiting for the signed-in user to approve (D70): the head of design's designs, or a marketing manager's
 * artwork once the design is approved. Each shows the latest artwork to review and the actions the user may take.
 * A marketing manager's approved jobs follow, ready to close in one click.
 */
@Component({
  selector: 'app-approvals-page',
  imports: [DueDate, JobActionArea, RouterLink, StatusChip],
  template: `
    <div class="px-8 pt-2 pb-8">
      <h1 class="page-title">Approvals</h1>
      <p class="mt-1 text-sm text-ink-muted">
        @if (approvals.hasValue()) {
          {{ waiting().length }} waiting
          @if (ready().length > 0) {
            &middot; {{ ready().length }} ready to close
          }
        }
      </p>

      @if (approvals.error()) {
        <p class="empty-state mt-6 text-over-700">
          The queue could not be loaded. Refresh the page to try again.
        </p>
      } @else if (approvals.hasValue()) {
        <ul class="mt-6 space-y-4">
          @for (item of waiting(); track item.job.id) {
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

        @if (ready().length > 0) {
          <div class="mt-8 flex items-center justify-between gap-4">
            <h2 class="label-caps">Ready to close</h2>
            <button type="button" class="btn-secondary" [disabled]="closing()" (click)="closeAll()">
              Close all
            </button>
          </div>
          <ul class="mt-4 space-y-4">
            @for (item of ready(); track item.job.id) {
              @let job = item.job;
              <li class="panel flex flex-wrap items-center justify-between gap-4 p-6">
                <div class="min-w-0">
                  <span
                    class="flex items-center gap-2 text-xs text-ink-muted"
                    [style.--hue]="job.colour"
                  >
                    <span class="hue-dot size-2 shrink-0 rounded-full"></span>
                    {{ job.code }}
                  </span>
                  <h3 class="mt-2 font-display text-base font-semibold">{{ job.title }}</h3>
                  <p class="mt-1 text-sm">
                    <a class="btn-quiet -ml-3" [routerLink]="['/requests', job.id]">Brief and activity</a>
                  </p>
                </div>
                <div class="flex items-center gap-4">
                  <app-status-chip [name]="job.statusName" [colour]="job.statusColour" />
                  <button type="button" class="btn-primary" [disabled]="closing()" (click)="close(job.id)">
                    Close
                  </button>
                </div>
              </li>
            }
          </ul>
        }
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

  private readonly runner = inject(ActionRunner);
  private readonly toast = inject(ToastService);

  protected readonly closing = signal(false);

  protected readonly ready = computed(() => this.queue().filter((q) => q.job.actions.includes('Close')));

  protected readonly waiting = computed(() => this.queue().filter((q) => !q.job.actions.includes('Close')));

  private readonly queue = computed(() => (this.approvals.hasValue() ? this.approvals.value() : []));

  protected async close(id: string): Promise<void> {
    this.closing.set(true);
    await this.runner.runOneClick(id, 'Close');
    this.closing.set(false);
  }

  protected async closeAll(): Promise<void> {
    this.closing.set(true);
    const ids = this.ready().map((q) => q.job.id);
    try {
      for (const id of ids) {
        await this.jobs.close(id);
      }
      this.toast.show(`${ids.length} ${this.auth.terms().job.toLowerCase()}${ids.length === 1 ? '' : 's'} closed.`, 'success');
    } catch (error) {
      this.toast.error(error);
    } finally {
      this.jobs.notifyChanged();
      this.closing.set(false);
    }
  }
}
