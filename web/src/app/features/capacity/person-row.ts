import { Component, computed, input } from '@angular/core';
import { Allocation, DayLoad, SchedulePerson } from '../../core/models';
import { Avatar } from '../../shared/avatar';
import { LOAD_CLASSES, formatHours, loadLevel } from '../../shared/load-colour';
import { AllocationBar } from './allocation-bar';
import { placeBars, timeOffBlocks } from './grid-layout';

/**
 * One person: a sticky name cell, then their days on the parent grid's columns (subgrid).
 * Timeline rows: a spacer, one lane per stacked bar, the load row, a spacer.
 */
@Component({
  selector: 'app-person-row',
  imports: [Avatar, AllocationBar],
  host: { class: 'col-span-full grid grid-cols-subgrid border-b border-slate-200' },
  template: `
    <div class="sticky left-0 z-20 flex items-center gap-3 border-r border-slate-200 bg-white px-4 py-2">
      <app-avatar [name]="person().name" [colour]="person().avatarColour" />
      <div class="min-w-0 leading-tight">
        <div class="truncate text-sm font-medium">{{ person().name }}</div>
        <div class="truncate text-xs text-slate-500" [attr.title]="person().jobTitle">
          {{ hoursPerDay() }}h/day &middot; {{ person().jobTitle }}
        </div>
      </div>
    </div>

    <div class="col-[2/-1] grid grid-cols-subgrid gap-y-1" [style.grid-template-rows]="rows()">
      @for (day of person().days; track day.date; let i = $index) {
        <div
          class="row-span-full border-l"
          [class.border-slate-300]="i % 5 === 0"
          [class.border-slate-100]="i % 5 !== 0"
          [class.bg-accent-50]="day.date === today()"
          [style.grid-column]="i + 1"
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
          class="hatched z-10 mx-px flex items-center justify-center overflow-hidden rounded text-xs text-slate-600"
          [style.grid-column]="block.start + 1 + ' / ' + (block.end + 2)"
          [style.grid-row]="'2 / span ' + lanes()"
          [attr.title]="block.label"
        >
          <span class="truncate px-1">{{ block.label }}</span>
        </div>
      }

      @for (day of person().days; track day.date; let i = $index) {
        <div class="flex items-center justify-center px-0.5" [style.grid-column]="i + 1" [style.grid-row]="lanes() + 2">
          <span
            class="truncate rounded px-1.5 py-0.5 text-[11px] font-medium"
            [class]="loadClasses[level(day)]"
            [attr.title]="day.timeOff ?? describe(day)"
            >{{ loadLabel(day) }}</span
          >
        </div>
      }
    </div>
  `,
})
export class PersonRow {
  readonly person = input.required<SchedulePerson>();
  readonly allocations = input.required<Allocation[]>();
  readonly days = input.required<string[]>();
  readonly today = input.required<string>();
  /** Short load labels for the narrow 4-week columns. */
  readonly compact = input(false);

  protected readonly loadClasses = LOAD_CLASSES;
  protected readonly level = loadLevel;

  protected readonly hoursPerDay = computed(() => formatHours(this.person().hoursPerDay));
  protected readonly bars = computed(() => placeBars(this.allocations(), this.days()));
  protected readonly blocks = computed(() => timeOffBlocks(this.person().days));
  protected readonly lanes = computed(() => Math.max(1, ...this.bars().map((b) => b.lane + 1)));
  protected readonly rows = computed(() => `0.25rem repeat(${this.lanes()}, 1.5rem) 1.5rem 0.25rem`);

  /** Hours free, or hours over capacity on a red day. */
  protected loadLabel(day: DayLoad): string {
    if (day.capacity === 0) return 'Off';
    const over = day.allocated - day.capacity;
    if (over > 0) return this.compact() ? `+${formatHours(over)}` : `${formatHours(over)}h over`;
    const free = formatHours(-over);
    return this.compact() ? `${free}h` : `${free}h free`;
  }

  protected describe(day: DayLoad): string {
    return `${formatHours(day.allocated)}h of ${formatHours(day.capacity)}h booked`;
  }
}
