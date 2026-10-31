import { Component, computed, input } from '@angular/core';
import { DesignerCount, StatusCount } from '../../core/models';
import { Tooltip } from '../../shared/tooltip';
import { StatusLegend } from './status-legend';

/** A clean step for about four gridlines: 1, 2 or 5 times a power of ten. */
export function tickStep(largest: number): number {
  const rough = Math.max(1, largest / 4);
  const power = 10 ** Math.floor(Math.log10(rough));
  return [1, 2, 5, 10].map((m) => m * power).find((step) => step >= rough)!;
}

/**
 * "Capacity by designer": a column of cards per person, stacked by status in board order from the baseline, so the
 * open work sits at the bottom and lines up across people. Each segment's tooltip gives its count.
 */
@Component({
  selector: 'app-designer-chart',
  imports: [StatusLegend, Tooltip],
  host: { class: 'panel block p-6' },
  template: `
    <h2 class="font-display text-lg font-semibold">{{ teamName() }} capacity by designer</h2>
    <p class="mt-1 text-sm text-ink-muted">Cards per person by status, the most open work first</p>

    @if (columns().length === 0) {
      <p class="empty-state mt-6">No one in this team yet.</p>
    } @else {
      <div class="mt-8 flex gap-2">
        <div class="relative h-60 w-6 shrink-0 text-right text-xs text-ink-muted tabular-nums" aria-hidden="true">
          @for (tick of ticks(); track tick) {
            <span class="absolute right-0 translate-y-1/2" [style.bottom.%]="(tick / top()) * 100">{{ tick }}</span>
          }
        </div>
        <div class="min-w-0 flex-1">
          <div class="relative flex h-60 items-end">
            @for (tick of ticks(); track tick) {
              <div class="absolute inset-x-0 border-t border-line" [style.bottom.%]="(tick / top()) * 100"></div>
            }
            @for (column of columns(); track column.key) {
              <div
                class="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-control focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
                tabindex="0"
                [attr.aria-label]="column.label"
              >
                <span class="mb-1 text-xs font-semibold tabular-nums">{{ column.total }}</span>
                <div
                  class="flex w-6 flex-col-reverse gap-0.5 overflow-hidden rounded-t-bar"
                  [style.height.%]="(column.total / top()) * 100"
                >
                  @for (segment of column.segments; track segment.statusId) {
                    <div
                      class="min-h-0.5 basis-0"
                      [class]="colours().get(segment.statusId)"
                      [style.flex-grow]="segment.count"
                      [appTooltip]="segment.label"
                    ></div>
                  }
                </div>
              </div>
            }
          </div>
          <div class="mt-2 flex" aria-hidden="true">
            @for (column of columns(); track column.key) {
              <span class="min-w-0 flex-1 truncate px-0.5 text-center text-xs text-ink-muted" [appTooltip]="column.name">
                {{ column.shortName }}
              </span>
            }
          </div>
        </div>
      </div>
      <app-status-legend class="mt-6" [statuses]="statuses()" [colours]="colours()" />
    }
  `,
})
export class DesignerChart {
  readonly designers = input.required<DesignerCount[]>();
  readonly statuses = input.required<StatusCount[]>();
  readonly colours = input.required<Map<string, string>>();
  readonly teamName = input.required<string>();

  protected readonly columns = computed(() =>
    this.designers().map((designer) => {
      const name = designer.name ?? 'Unassigned';
      const segments = this.statuses()
        .map((status) => ({ statusId: status.statusId, count: designer.counts[status.statusId] ?? 0, name: status.name }))
        .filter((segment) => segment.count > 0)
        .map((segment) => ({ ...segment, label: `${name} · ${segment.name}: ${segment.count}` }));
      const total = segments.reduce((sum, s) => sum + s.count, 0);
      return {
        key: designer.personId ?? 'unassigned',
        name,
        shortName: designer.name?.split(' ')[0] ?? name,
        total,
        segments,
        label: `${name}: ${total} ${total === 1 ? 'card' : 'cards'}${segments.map((s) => `, ${s.name} ${s.count}`).join('')}`,
      };
    }),
  );

  private readonly step = computed(() => tickStep(Math.max(0, ...this.columns().map((c) => c.total))));

  /** The axis top: the largest column, rounded up to a whole step. */
  protected readonly top = computed(() => {
    const largest = Math.max(1, ...this.columns().map((c) => c.total));
    return Math.ceil(largest / this.step()) * this.step();
  });

  protected readonly ticks = computed(() =>
    Array.from({ length: this.top() / this.step() + 1 }, (_, i) => i * this.step()),
  );
}
