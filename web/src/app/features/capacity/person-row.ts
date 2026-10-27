import { formatDate } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, input } from '@angular/core';
import { Allocation, SchedulePerson } from '../../core/models';
import { Avatar } from '../../shared/avatar';
import {
  Load,
  UTILISATION_BAR,
  UTILISATION_TEXT,
  bookedShare,
  dayState,
  formatHours,
  totalLoad,
  utilisationLevel,
} from '../../shared/load-colour';
import { AllocationBar } from './allocation-bar';
import { TimeOffBlock, dayColumn, placeBars, timeOffBlocks } from './grid-layout';

/**
 * One person: a sticky name and utilisation cell, then their days on the parent grid's columns (subgrid).
 * Timeline rows: a spacer, the availability strip, one lane per stacked booking, a spacer.
 */
@Component({
  selector: 'app-person-row',
  imports: [Avatar, AllocationBar],
  host: { class: 'col-span-full grid grid-cols-subgrid border-b border-line' },
  template: `
    <div class="sticky left-0 z-20 flex items-center gap-3 border-r border-line bg-surface px-4 py-3">
      <app-avatar [name]="person().name" [colour]="person().avatarColour" />
      <div class="min-w-0 flex-1 leading-tight">
        <div class="text-sm font-semibold">{{ person().name }}</div>
        <div class="mt-0.5 text-xs text-ink-muted">{{ person().jobTitle }}</div>
        <div class="mt-0.5 text-xs text-ink-muted">{{ hoursPerDay() }}h/day</div>
      </div>
      <div class="w-12 shrink-0 text-right" [attr.title]="describe(period())">
        <div class="text-xs font-semibold" [class]="utilisationText[periodLevel()]">{{ utilisation() }}</div>
        <div class="mt-1 h-1 overflow-hidden rounded-full bg-surface-muted">
          <div class="h-full rounded-full" [class]="utilisationBar[periodLevel()]" [style.width.%]="barWidth()"></div>
        </div>
      </div>
    </div>

    <div class="col-[2/-1] grid grid-cols-subgrid gap-y-1" [style.grid-template-rows]="rows()">
      @for (day of person().days; track day.date; let i = $index) {
        <div
          class="row-span-full border-l"
          [class]="i % 5 === 0 ? 'border-ink-faint' : 'border-line'"
          [class.bg-over-50]="dayState(day) === 'over'"
          [style.grid-column]="dayColumn(i) + 1"
          [attr.title]="day.timeOff ?? describe(day)"
        ></div>
        <!-- A mini fill bar: booked hours in a neutral tone, free hours in green; all red when over capacity. -->
        @if (dayState(day) !== 'off') {
          <div
            class="row-start-2 mx-0.5 flex overflow-hidden rounded-full"
            [class]="dayState(day) === 'over' ? 'bg-over-500' : 'bg-ok-500'"
            [style.grid-column]="dayColumn(i) + 1"
            [attr.title]="describe(day)"
          >
            @if (dayState(day) === 'working') {
              <div class="bg-ink-faint" [style.width.%]="bookedShare(day) * 100"></div>
            }
          </div>
        }
      }
      @for (column of weekendColumns(); track column) {
        <div class="row-span-full bg-surface-muted" [style.grid-column]="column"></div>
      }

      @for (bar of bars(); track bar.allocation.id + ':' + bar.start) {
        <app-allocation-bar
          [allocation]="bar.allocation"
          [style.grid-column]="span(bar.start, bar.end)"
          [style.grid-row]="bar.lane + 3"
        />
      }

      @for (block of blocks(); track block.start) {
        <div
          class="z-10 mx-0.5 flex flex-col justify-center overflow-hidden rounded-bar bg-ink px-2 leading-tight text-white"
          [class.items-center]="block.start === block.end"
          [style.grid-column]="span(block.start, block.end)"
          [style.grid-row]="'3 / span ' + lanes()"
          [attr.title]="block.label + ' · ' + dateRange(block)"
        >
          <!-- A one-day block is too narrow for the label; the tooltip has it. -->
          @if (block.start === block.end) {
            <span class="text-xs font-semibold">Off</span>
          } @else {
            <span class="truncate text-xs font-semibold">{{ block.label }}</span>
            <span class="truncate text-[11px]">{{ dateRange(block) }}</span>
          }
        </div>
      }
    </div>
  `,
})
export class PersonRow {
  private readonly locale = inject(LOCALE_ID);

  readonly person = input.required<SchedulePerson>();
  readonly allocations = input.required<Allocation[]>();

  protected readonly utilisationText = UTILISATION_TEXT;
  protected readonly utilisationBar = UTILISATION_BAR;
  protected readonly bookedShare = bookedShare;
  protected readonly dayState = dayState;
  protected readonly dayColumn = dayColumn;

  protected readonly hoursPerDay = computed(() => formatHours(this.person().hoursPerDay));
  protected readonly bars = computed(() => placeBars(this.allocations(), this.person().days));
  protected readonly blocks = computed(() => timeOffBlocks(this.person().days));
  protected readonly lanes = computed(() => Math.max(1, ...this.bars().map((b) => b.lane + 1)));
  protected readonly rows = computed(() => `0.25rem 0.375rem repeat(${this.lanes()}, 2.5rem) 0.25rem`);

  /** The weekend column after each week (1-based, within the timeline). */
  protected readonly weekendColumns = computed(() =>
    Array.from({ length: this.person().days.length / 5 }, (_, w) => w * 6 + 6),
  );

  /** Utilisation over the days shown (D14); under 50% shows as available. */
  protected readonly period = computed(() => totalLoad(this.person().days));
  protected readonly periodLevel = computed(() => utilisationLevel(this.period()));
  protected readonly ratio = computed(() => {
    const { allocated, capacity } = this.period();
    return capacity === 0 ? null : allocated / capacity;
  });
  protected readonly utilisation = computed(() => {
    const ratio = this.ratio();
    return ratio === null ? '-' : `${Math.round(ratio * 100)}%`;
  });
  protected readonly barWidth = computed(() => Math.min(100, (this.ratio() ?? 0) * 100));

  /** Grid columns from the first to the last weekday (0-based indexes). */
  protected span(start: number, end: number): string {
    return `${dayColumn(start) + 1} / ${dayColumn(end) + 2}`;
  }

  protected describe(load: Load): string {
    return `${formatHours(load.allocated)}h of ${formatHours(load.capacity)}h booked`;
  }

  /** The whole run of days off: "16 Dec", "2–6 Nov" or "30 Oct – 3 Nov". */
  protected dateRange(block: TimeOffBlock): string {
    const date = (d: string, format: string) => formatDate(d, format, this.locale);
    if (block.from === block.to) return date(block.from, 'd MMM');
    return block.from.slice(0, 7) === block.to.slice(0, 7)
      ? `${date(block.from, 'd')}–${date(block.to, 'd MMM')}`
      : `${date(block.from, 'd MMM')} – ${date(block.to, 'd MMM')}`;
  }
}
