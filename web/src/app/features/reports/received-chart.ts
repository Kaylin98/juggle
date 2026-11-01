import { formatDate } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, input } from '@angular/core';
import { MonthCount } from '../../core/models';
import { Tooltip } from '../../shared/tooltip';

/** "Briefs received over the last 9 months": a bar per month against the busiest month, with its count at the tip. */
@Component({
  selector: 'app-received-chart',
  imports: [Tooltip],
  host: { class: 'panel block p-6' },
  template: `
    <h2 class="font-display text-lg font-semibold">Briefs received over the last 9 months</h2>
    <p class="mt-1 text-sm text-ink-muted">Briefs sent to the {{ teamName() }} team, by the month they came in</p>

    @if (total() === 0) {
      <p class="empty-state mt-6">No briefs received in the last 9 months.</p>
    } @else {
      <ul class="mt-6 space-y-3">
        @for (row of rows(); track row.month) {
          <li
            class="flex items-center gap-4 rounded-control focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
            tabindex="0"
            [attr.aria-label]="row.label"
            [appTooltip]="row.label"
          >
            <span class="w-20 shrink-0 text-sm text-ink-muted">{{ row.name }}</span>
            <span class="flex min-w-0 flex-1 items-center gap-2">
              @if (row.count > 0) {
                <span class="h-4 rounded-r-bar bg-accent-500" [style.width.%]="(row.count / largest()) * 90"></span>
              }
              <span class="text-sm font-semibold tabular-nums">{{ row.count }}</span>
            </span>
          </li>
        }
      </ul>
    }
  `,
})
export class ReceivedChart {
  private readonly locale = inject(LOCALE_ID);

  readonly months = input.required<MonthCount[]>();
  readonly teamName = input.required<string>();

  protected readonly total = computed(() => this.months().reduce((sum, m) => sum + m.count, 0));

  protected readonly largest = computed(() => Math.max(1, ...this.months().map((m) => m.count)));

  protected readonly rows = computed(() =>
    this.months().map((m) => ({
      month: m.month,
      count: m.count,
      name: formatDate(m.month, 'MMM y', this.locale),
      label: `${formatDate(m.month, 'MMMM y', this.locale)}: ${m.count} ${m.count === 1 ? 'brief' : 'briefs'} received`,
    })),
  );
}
