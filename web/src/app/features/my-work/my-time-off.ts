import { Component, LOCALE_ID, inject, input } from '@angular/core';
import { MyTimeOff } from '../../core/models';
import { formatDateRange } from '../../shared/dates';

/** The person's leave that has not ended yet, earliest first. */
@Component({
  selector: 'app-my-time-off',
  host: { class: 'panel block p-6' },
  template: `
    <h2 class="font-display text-lg font-semibold">Upcoming time off</h2>
    <p class="mt-1 text-sm text-ink-muted">Your leave from today on</p>

    @if (timeOff().length) {
      <ul class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        @for (leave of timeOff(); track leave.id) {
          <li class="rounded-control bg-page px-4 py-3">
            <div class="text-sm font-semibold">{{ leave.label }}</div>
            <div class="mt-1 text-xs text-ink-muted">
              {{ dates(leave) }} &middot; {{ leave.workingDays }} working {{ leave.workingDays === 1 ? 'day' : 'days' }}
            </div>
          </li>
        }
      </ul>
    } @else {
      <p class="mt-6 text-sm text-ink-muted">No time off coming up.</p>
    }
  `,
})
export class MyTimeOffPanel {
  private readonly locale = inject(LOCALE_ID);

  readonly timeOff = input.required<MyTimeOff[]>();

  protected dates(leave: MyTimeOff): string {
    return formatDateRange(leave.startDate, leave.endDate, this.locale);
  }
}
