import { Component, computed, input } from '@angular/core';
import { Allocation, DayLoad, SchedulePerson } from '../../core/models';
import { Avatar } from '../../shared/avatar';
import { LOAD_BAR, LOAD_TEXT, Load, formatHours, loadLevel, totalLoad } from '../../shared/load-colour';
import { AllocationBar } from './allocation-bar';
import { placeBars, timeOffBlocks } from './grid-layout';

/**
 * One person: a sticky name and utilisation cell, then their days on the parent grid's columns (subgrid).
 * Timeline rows: a spacer, one lane per stacked bar, then a footer line for hours over capacity.
 */
@Component({
  selector: 'app-person-row',
  imports: [Avatar, AllocationBar],
  host: { class: 'col-span-full grid grid-cols-subgrid border-b border-line' },
  template: `
    <div class="sticky left-0 z-20 flex items-center gap-3 border-r border-line bg-surface px-4 py-2">
      <app-avatar [name]="person().name" [colour]="person().avatarColour" />
      <div class="min-w-0 flex-1 leading-tight">
        <div class="truncate text-sm font-semibold">{{ person().name }}</div>
        <div class="mt-0.5 truncate text-xs text-ink-muted" [attr.title]="person().jobTitle">
          {{ hoursPerDay() }}h/day &middot; {{ person().jobTitle }}
        </div>
      </div>
      <div class="w-12 shrink-0 text-right" [attr.title]="describe(period())">
        <div class="text-xs font-semibold" [class]="loadText[periodLevel()]">{{ utilisation() }}</div>
        <div class="mt-1 h-1 overflow-hidden rounded-full bg-surface-muted">
          <div class="h-full rounded-full" [class]="loadBar[periodLevel()]" [style.width.%]="barWidth()"></div>
        </div>
      </div>
    </div>

    <div class="col-[2/-1] grid grid-cols-subgrid gap-y-1" [style.grid-template-rows]="rows()">
      @for (day of person().days; track day.date; let i = $index) {
        <div
          class="row-span-full border-l"
          [class]="i % 5 === 0 ? 'border-line-strong' : 'border-line'"
          [class.bg-over-50]="isOver(day)"
          [style.grid-column]="i + 1"
          [attr.title]="day.timeOff ?? describe(day)"
        ></div>
      }

      @for (bar of bars(); track bar.allocation.id) {
        <app-allocation-bar
          [allocation]="bar.allocation"
          [style.grid-column]="bar.start + 1 + ' / ' + (bar.end + 2)"
          [style.grid-row]="bar.lane + 2"
        />
      }

      @for (block of blocks(); track block.start) {
        <div
          class="hatched z-10 mx-0.5 flex items-center justify-center overflow-hidden rounded-bar text-xs text-ink-muted"
          [style.grid-column]="block.start + 1 + ' / ' + (block.end + 2)"
          [style.grid-row]="'2 / span ' + lanes()"
          [attr.title]="block.label"
        >
          <span class="truncate rounded-full bg-surface px-2">{{ block.label }}</span>
        </div>
      }

      @for (day of person().days; track day.date; let i = $index) {
        @if (isOver(day)) {
          <div
            class="pointer-events-none truncate px-1 text-center text-[11px] leading-4 font-semibold text-over-700"
            [style.grid-column]="i + 1"
            [style.grid-row]="lanes() + 2"
          >
            +{{ hoursOver(day) }}h
          </div>
        }
      }
    </div>
  `,
})
export class PersonRow {
  readonly person = input.required<SchedulePerson>();
  readonly allocations = input.required<Allocation[]>();
  readonly days = input.required<string[]>();

  protected readonly loadText = LOAD_TEXT;
  protected readonly loadBar = LOAD_BAR;

  protected readonly hoursPerDay = computed(() => formatHours(this.person().hoursPerDay));
  protected readonly bars = computed(() => placeBars(this.allocations(), this.days()));
  protected readonly blocks = computed(() => timeOffBlocks(this.person().days));
  protected readonly lanes = computed(() => Math.max(1, ...this.bars().map((b) => b.lane + 1)));
  protected readonly rows = computed(() => `0.25rem repeat(${this.lanes()}, 1.5rem) 1rem`);

  /** Utilisation over the days shown (D14), coloured like a day (D15). */
  protected readonly period = computed(() => totalLoad(this.person().days));
  protected readonly periodLevel = computed(() => loadLevel(this.period()));
  protected readonly ratio = computed(() => {
    const { allocated, capacity } = this.period();
    return capacity === 0 ? null : allocated / capacity;
  });
  protected readonly utilisation = computed(() => {
    const ratio = this.ratio();
    return ratio === null ? '-' : `${Math.round(ratio * 100)}%`;
  });
  protected readonly barWidth = computed(() => Math.min(100, (this.ratio() ?? 0) * 100));

  protected isOver(day: DayLoad): boolean {
    return loadLevel(day) === 'red';
  }

  protected hoursOver(day: DayLoad): string {
    return formatHours(day.allocated - day.capacity);
  }

  protected describe(load: Load): string {
    return `${formatHours(load.allocated)}h of ${formatHours(load.capacity)}h booked`;
  }
}
