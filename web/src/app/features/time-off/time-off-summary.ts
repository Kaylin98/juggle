import { Component, LOCALE_ID, computed, inject, input } from '@angular/core';
import { TimeOffApproval } from '../../core/models';
import { Avatar } from '../../shared/avatar';
import { formatDateRange } from '../../shared/dates';

/** Who asks for which time off: the person and their teams, the type, the dates and the note. */
@Component({
  selector: 'app-time-off-summary',
  imports: [Avatar],
  host: { class: 'flex min-w-0 items-start gap-4' },
  template: `
    <app-avatar [name]="request().personName" [colour]="request().avatarColour" />
    <div class="min-w-0">
      <div class="text-sm font-semibold">{{ request().personName }}</div>
      <div class="text-xs text-ink-muted">{{ request().jobTitle }} &middot; {{ request().teams.join(', ') }}</div>
      <div class="mt-3 font-display text-base font-semibold">{{ request().label }}</div>
      <div class="mt-1 text-sm text-ink-muted">
        {{ dates() }} &middot; {{ request().workingDays }} working {{ request().workingDays === 1 ? 'day' : 'days' }}
      </div>
      @if (request().note; as note) {
        <p class="mt-3 text-sm">{{ note }}</p>
      }
    </div>
  `,
})
export class TimeOffSummary {
  private readonly locale = inject(LOCALE_ID);

  readonly request = input.required<TimeOffApproval>();

  protected readonly dates = computed(() => formatDateRange(this.request().startDate, this.request().endDate, this.locale));
}
