import { Component, computed, input } from '@angular/core';
import { DesignerCount, ColumnCount } from '../../core/models';
import { Tooltip } from '../../shared/tooltip';
import { StatusLegend } from './status-legend';

/** A clean step for about four gridlines: 1, 2 or 5 times a power of ten. */
export function tickStep(largest: number): number {
  const rough = Math.max(1, largest / 4);
  const power = 10 ** Math.floor(Math.log10(rough));
  return [1, 2, 5, 10].map((m) => m * power).find((step) => step >= rough)!;
}

/**
 * "Capacity by designer": a column of jobs per person, stacked by board column in order from the baseline, so the
 * open work sits at the bottom and lines up across people. Each segment's tooltip gives its count.
 */
@Component({
  selector: 'app-designer-chart',
  imports: [StatusLegend, Tooltip],
  host: { class: 'panel block p-6' },
  template: `
    <h2 class="font-display text-lg font-semibold">{{ teamName() }} capacity by designer</h2>
    <p class="mt-1 text-sm text-ink-muted">Jobs per person by board column, the most open work first</p>

    @if (bars().length === 0) {
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
            @for (bar of bars(); track bar.key) {
              <div
                class="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-control focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
                tabindex="0"
                [attr.aria-label]="bar.label"
              >
                <span class="mb-1 text-xs font-semibold tabular-nums">{{ bar.total }}</span>
                <div
                  class="flex w-6 flex-col-reverse gap-0.5 overflow-hidden rounded-t-bar"
                  [style.height.%]="(bar.total / top()) * 100"
                >
                  @for (segment of bar.segments; track segment.columnId) {
                    <div
                      class="min-h-0.5 basis-0"
                      [class]="colours().get(segment.columnId)"
                      [style.flex-grow]="segment.count"
                      [appTooltip]="segment.label"
                    ></div>
                  }
                </div>
              </div>
            }
          </div>
          <div class="mt-2 flex" aria-hidden="true">
            @for (bar of bars(); track bar.key) {
              <span class="min-w-0 flex-1 truncate px-0.5 text-center text-xs text-ink-muted" [appTooltip]="bar.name">
                {{ bar.shortName }}
              </span>
            }
          </div>
        </div>
      </div>
      <app-status-legend class="mt-6" [columns]="columns()" [colours]="colours()" />
    }
  `,
})
export class DesignerChart {
  readonly designers = input.required<DesignerCount[]>();
  readonly columns = input.required<ColumnCount[]>();
  readonly colours = input.required<Map<string, string>>();
  readonly teamName = input.required<string>();

  protected readonly bars = computed(() =>
    this.designers().map((designer) => {
      const name = designer.name ?? 'No designer';
      const segments = this.columns()
        .map((column) => ({ columnId: column.columnId, count: designer.counts[column.columnId] ?? 0, name: column.name }))
        .filter((segment) => segment.count > 0)
        .map((segment) => ({ ...segment, label: `${name} · ${segment.name}: ${segment.count}` }));
      const total = segments.reduce((sum, s) => sum + s.count, 0);
      return {
        key: designer.personId ?? 'unassigned',
        name,
        shortName: designer.name?.split(' ')[0] ?? name,
        total,
        segments,
        label: `${name}: ${total} ${total === 1 ? 'job' : 'jobs'}${segments.map((s) => `, ${s.name} ${s.count}`).join('')}`,
      };
    }),
  );

  private readonly step = computed(() => tickStep(Math.max(0, ...this.bars().map((b) => b.total))));

  /** The axis top: the largest column, rounded up to a whole step. */
  protected readonly top = computed(() => {
    const largest = Math.max(1, ...this.bars().map((b) => b.total));
    return Math.ceil(largest / this.step()) * this.step();
  });

  protected readonly ticks = computed(() =>
    Array.from({ length: this.top() / this.step() + 1 }, (_, i) => i * this.step()),
  );
}
