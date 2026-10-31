import { Component, inject, signal } from '@angular/core';
import { TimeOffApproval } from '../../core/models';
import { TimeOffService } from '../../core/time-off.service';
import { Drawer } from '../../shared/drawer';
import { ToastService } from '../../shared/toast.service';
import { DeclineDialog } from './decline-dialog';
import { TimeOffSummary } from './time-off-summary';

/**
 * Time off waiting for approval from the people in the viewer's teams (Team Admins of any of their teams, and
 * Org Admins), earliest first. Approving takes the days off their capacity; declining needs a reason.
 */
@Component({
  selector: 'app-time-off-page',
  imports: [DeclineDialog, Drawer, TimeOffSummary],
  template: `
    <div class="px-8 pt-2 pb-8">
      <h1 class="page-title">Time off</h1>
      <p class="mt-1 text-sm text-ink-muted">
        Requests from the people in your teams
        @if (approvals.hasValue()) {
          &middot; {{ approvals.value().length }} waiting
        }
      </p>

      @if (approvals.error()) {
        <p class="empty-state mt-6 text-over-700">The requests could not be loaded. Refresh the page to try again.</p>
      } @else if (approvals.hasValue()) {
        <ul class="mt-6 space-y-4">
          @for (request of approvals.value(); track request.id) {
            <li class="panel flex flex-wrap items-start gap-6 p-6">
              <app-time-off-summary class="flex-1" [request]="request" />
              <div class="flex shrink-0 gap-2">
                <button type="button" class="btn-secondary" (click)="declining.set(request)">Decline</button>
                <button type="button" class="btn-primary" [disabled]="approving() === request.id" (click)="approve(request)">
                  Approve
                </button>
              </div>
            </li>
          } @empty {
            <li class="empty-state">Nothing waiting. Time off requests from your teams show up here.</li>
          }
        </ul>
      } @else {
        <p class="empty-state mt-6">Loading the requests...</p>
      }
    </div>

    @if (declining(); as request) {
      <app-drawer heading="Decline time off" (closed)="declining.set(null)">
        <app-decline-dialog [request]="request" (done)="decided()" (closed)="declining.set(null)" />
      </app-drawer>
    }
  `,
})
export class TimeOffPage {
  private readonly timeOff = inject(TimeOffService);
  private readonly toast = inject(ToastService);

  /** Shared with the nav badge, so both refresh together. */
  protected readonly approvals = this.timeOff.approvals;

  protected readonly declining = signal<TimeOffApproval | null>(null);
  protected readonly approving = signal<string | null>(null);

  protected async approve(request: TimeOffApproval): Promise<void> {
    this.approving.set(request.id);
    try {
      await this.timeOff.approve(request.id);
      this.toast.show(`Time off approved for ${request.personName}.`, 'success');
    } catch (error) {
      this.toast.error(error);
    }
    this.approving.set(null);
    this.approvals.reload();
  }

  protected decided(): void {
    this.declining.set(null);
    this.approvals.reload();
  }
}
