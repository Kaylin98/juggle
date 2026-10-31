import { Component, LOCALE_ID, inject, input, output, signal } from '@angular/core';
import { MyTimeOff, TimeOffStatus } from '../../core/models';
import { TimeOffService } from '../../core/time-off.service';
import { formatDateRange } from '../../shared/dates';
import { Drawer } from '../../shared/drawer';
import { ToastService } from '../../shared/toast.service';
import { TimeOffForm } from '../time-off/time-off-form';

const PILL: Record<TimeOffStatus, string> = {
  Pending: 'bg-warn-50 text-warn-700',
  Approved: 'bg-ok-50 text-ok-700',
  Declined: 'bg-over-50 text-over-700',
};

/**
 * The person's leave that has not ended yet, earliest first, with its status: pending requests can be cancelled,
 * declined ones show the reason. "Request time off" opens the request form in a drawer.
 */
@Component({
  selector: 'app-my-time-off',
  imports: [Drawer, TimeOffForm],
  host: { class: 'panel block p-6' },
  template: `
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="font-display text-lg font-semibold">Upcoming time off</h2>
        <p class="mt-1 text-sm text-ink-muted">Your leave and requests from today on</p>
      </div>
      <button type="button" class="btn-primary" (click)="requesting.set(true)">Request time off</button>
    </div>

    @if (timeOff().length) {
      <ul class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        @for (leave of timeOff(); track leave.id) {
          <li class="rounded-control bg-page px-4 py-3">
            <div class="flex items-start justify-between gap-2">
              <span class="text-sm font-semibold">{{ leave.label }}</span>
              <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" [class]="pill[leave.status]">{{ leave.status }}</span>
            </div>
            <div class="mt-1 text-xs text-ink-muted">
              {{ dates(leave) }} &middot; {{ leave.workingDays }} working {{ leave.workingDays === 1 ? 'day' : 'days' }}
            </div>
            @if (leave.declineReason; as reason) {
              <p class="mt-2 text-xs"><span class="font-semibold">Reason:</span> {{ reason }}</p>
            }
            @if (leave.status === 'Pending') {
              <button
                type="button"
                class="btn-quiet mt-2 text-xs"
                [disabled]="cancelling() === leave.id"
                (click)="cancel(leave)"
              >
                Cancel request
              </button>
            }
          </li>
        }
      </ul>
    } @else {
      <p class="mt-6 text-sm text-ink-muted">No time off coming up.</p>
    }

    @if (requesting()) {
      <app-drawer heading="Request time off" (closed)="requesting.set(false)">
        <app-time-off-form class="px-6 pt-2 pb-6" (requested)="requested()" (cancelled)="requesting.set(false)" />
      </app-drawer>
    }
  `,
})
export class MyTimeOffPanel {
  private readonly locale = inject(LOCALE_ID);
  private readonly service = inject(TimeOffService);
  private readonly toast = inject(ToastService);

  readonly timeOff = input.required<MyTimeOff[]>();
  /** A request was made or cancelled, so the page reloads. */
  readonly changed = output<void>();

  protected readonly pill = PILL;
  protected readonly requesting = signal(false);
  protected readonly cancelling = signal<string | null>(null);

  protected dates(leave: MyTimeOff): string {
    return formatDateRange(leave.startDate, leave.endDate, this.locale);
  }

  protected requested(): void {
    this.requesting.set(false);
    this.changed.emit();
  }

  protected async cancel(leave: MyTimeOff): Promise<void> {
    this.cancelling.set(leave.id);
    try {
      await this.service.cancel(leave.id);
      this.toast.show('Time off request cancelled.');
    } catch (error) {
      this.toast.error(error);
    }
    this.cancelling.set(null);
    this.changed.emit();
  }
}
