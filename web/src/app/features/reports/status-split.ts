import { Component, computed, input } from '@angular/core';
import { ColumnCount } from '../../core/models';
import { Tooltip } from '../../shared/tooltip';
import { StatusLegend } from './status-legend';

/** "Briefs completed vs in progress": one bar split by board column, the share done, and a legend with the counts. */
@Component({
  selector: 'app-status-split',
  imports: [StatusLegend, Tooltip],
  host: { class: 'panel block p-6' },
  template: `
    <h2 class="font-display text-lg font-semibold">Briefs completed vs in progress</h2>
    <p class="mt-1 text-sm text-ink-muted">Jobs on the {{ teamName() }} board, by column, without cancelled ones</p>

    @if (total() === 0) {
      <p class="empty-state mt-6">No briefs yet.</p>
    } @else {
      <div class="mt-6 flex items-baseline gap-4">
        <span class="font-display text-4xl font-semibold">{{ donePercent() }}% Done</span>
        <span class="text-sm text-ink-muted">{{ total() }} {{ total() === 1 ? 'brief' : 'briefs' }}</span>
      </div>
      <div class="mt-4 flex h-7 gap-0.5" role="list" aria-label="Briefs by column">
        @for (segment of segments(); track segment.columnId) {
          <div
            role="listitem"
            tabindex="0"
            class="min-w-1 basis-0 rounded-bar focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
            [class]="colours().get(segment.columnId)"
            [style.flex-grow]="segment.count"
            [attr.aria-label]="segment.label"
            [appTooltip]="segment.label"
          ></div>
        }
      </div>
      <app-status-legend class="mt-4" [columns]="columns()" [colours]="colours()" [showCounts]="true" />
    }
  `,
})
export class StatusSplit {
  readonly columns = input.required<ColumnCount[]>();
  readonly colours = input.required<Map<string, string>>();
  readonly teamName = input.required<string>();

  protected readonly total = computed(() => this.columns().reduce((sum, s) => sum + s.count, 0));

  protected readonly donePercent = computed(() => {
    const done = this.columns().filter((s) => s.done).reduce((sum, s) => sum + s.count, 0);
    return Math.round((done / this.total()) * 100);
  });

  /** A column with no jobs draws nothing. */
  protected readonly segments = computed(() =>
    this.columns()
      .filter((s) => s.count > 0)
      .map((s) => ({
        columnId: s.columnId,
        count: s.count,
        label: `${s.name}: ${s.count} (${Math.round((s.count / this.total()) * 100)}%)`,
      })),
  );
}
