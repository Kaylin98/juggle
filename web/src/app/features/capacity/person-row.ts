import { Component, LOCALE_ID, computed, inject, input } from '@angular/core';
import { Allocation, SchedulePerson } from '../../core/models';
import { Avatar } from '../../shared/avatar';
import { formatDateRange } from '../../shared/dates';
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
import { AllocationBar, BarGrip } from './allocation-bar';
import { Dated, PlacedBar, TimeOffBlock, dayColumn, placeBars, timeOffBlocks } from './grid-layout';

/**
 * Lane tracks in every row. The count stays the same as bookings stack and unstack (unused lanes are 0 high), so the
 * row's height can animate: CSS only interpolates track lists of the same length.
 */
const LANE_TRACKS = 8;

/**
 * One person: a sticky name and utilisation cell, then their days on the parent grid's columns (subgrid).
 * Timeline rows: a spacer, the availability strip, a gap, then the lanes, each a booking and the gap under it.
 * Day cells carry their index and the row its person id, so the grid can tell which cell is under the pointer.
 * During a drag the grid passes the bookings and day loads as the drop would leave them, so everything here
 * (stacking, strip, utilisation) shows the drop live.
 */
@Component({
  selector: 'app-person-row',
  imports: [Avatar, AllocationBar],
  host: {
    class: 'col-span-full grid grid-cols-subgrid border-b border-line',
    '[class.bg-accent-50]': 'highlighted()',
    '[attr.data-person-id]': 'person().id',
  },
  template: `
    <!-- The 1px shadow draws the row's bottom border over anything scrolled under this column (a holiday). -->
    <div
      class="sticky left-0 z-20 flex items-center gap-3 border-r border-line px-4 py-3 shadow-[0_1px_0_var(--color-line)]"
      [class]="highlighted() ? 'bg-accent-50' : 'bg-surface'"
    >
      <app-avatar [name]="person().name" [colour]="person().avatarColour" />
      <div class="min-w-0 flex-1 leading-tight">
        <div class="text-sm font-semibold">{{ person().name }}</div>
        <div class="mt-0.5 text-xs text-ink-muted">{{ person().jobTitle }}</div>
        <div class="mt-0.5 text-xs text-ink-muted">{{ hoursPerDay() }}h/day</div>
      </div>
      <div class="flex w-12 shrink-0 flex-col items-end" [attr.title]="describe(period())">
        <div class="text-xs font-semibold" [class]="utilisationText[periodLevel()]">{{ utilisation() }}</div>
        <div class="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-muted">
          <div class="h-full rounded-full" [class]="utilisationBar[periodLevel()]" [style.width.%]="barWidth()"></div>
        </div>
        @if (overbooked()) {
          <div class="mt-1 text-[11px] font-semibold whitespace-nowrap text-over-700">Overbooked</div>
        }
      </div>
    </div>

    <div
      class="col-[2/-1] grid grid-cols-subgrid transition-[grid-template-rows] duration-150 ease-out motion-reduce:transition-none"
      [class.cursor-cell]="editable()"
      [style.grid-template-rows]="rows()"
    >
      @for (day of person().days; track day.date; let i = $index) {
        <div
          class="row-span-full border-l"
          [class]="i % 5 === 0 ? 'border-ink-faint' : 'border-line'"
          [class.bg-over-50]="dayState(day) === 'over'"
          [style.grid-column]="dayColumn(i) + 1"
          [attr.title]="day.timeOff ?? describe(day)"
          [attr.data-day-index]="i"
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

      <!-- Days picked for a new booking, laid out where the booking will go. -->
      @for (piece of draftPieces(); track piece.start) {
        <div
          class="z-10 mx-0.5 mb-1 rounded-bar bg-accent-100 shadow-raised"
          [style.grid-column]="span(piece.start, piece.end)"
          [style.grid-row]="piece.lane + 4"
          data-booking="draft"
        ></div>
      }

      @for (bar of bars(); track bar.allocation.id + ':' + bar.start) {
        <app-allocation-bar
          [allocation]="bar.allocation"
          [editable]="editable() && !bar.allocation.otherTeam"
          [first]="bar.first"
          [last]="bar.last"
          [held]="held()?.id === bar.allocation.id ? held()!.grip : null"
          [style.grid-column]="span(bar.start, bar.end)"
          [style.grid-row]="bar.lane + 4"
        />
      }

      @for (block of blocks(); track block.start) {
        <div
          class="z-10 mx-0.5 mb-1 flex flex-col justify-center overflow-hidden rounded-bar bg-ink px-2 leading-tight text-white"
          [class.items-center]="block.start === block.end"
          [style.grid-column]="span(block.start, block.end)"
          [style.grid-row]="'4 / span ' + lanes()"
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
  /** The viewer can book and change this team's work (D24). */
  readonly editable = input(false);
  /** Days picked for a new booking: while dragging, and until it is saved or cancelled. */
  readonly draft = input<Dated | null>(null);
  /** A booking is being moved onto this row. */
  readonly highlighted = input(false);
  /** The booking the pointer holds on the grid, and by which part. */
  readonly held = input<{ id: string; grip: BarGrip } | null>(null);
  /** The booking being dragged or confirmed would put this person over capacity. */
  readonly overbooked = input(false);

  protected readonly utilisationText = UTILISATION_TEXT;
  protected readonly utilisationBar = UTILISATION_BAR;
  protected readonly bookedShare = bookedShare;
  protected readonly dayState = dayState;
  protected readonly dayColumn = dayColumn;

  protected readonly hoursPerDay = computed(() => formatHours(this.person().hoursPerDay));

  /** The bookings and the draft, stacked together as they will be once the draft is booked. */
  private readonly placed = computed(() => {
    const draft = this.draft();
    return placeBars<Allocation | Dated>([...this.allocations(), ...(draft ? [draft] : [])], this.person().days);
  });
  protected readonly bars = computed(() =>
    this.placed().filter((bar): bar is PlacedBar<Allocation> => bar.allocation !== this.draft()),
  );
  protected readonly draftPieces = computed(() => this.placed().filter((bar) => bar.allocation === this.draft()));

  protected readonly blocks = computed(() => timeOffBlocks(this.person().days));
  protected readonly lanes = computed(() => Math.max(1, ...this.placed().map((b) => b.lane + 1)));

  /**
   * Top spacer and gap, strip, gap, then each lane: a booking (2.5rem) and the gap under it (its margin). The
   * bottom spacer takes up any height left when the name cell is taller, so the day cells reach the row's end.
   */
  protected readonly rows = computed(() => {
    const lanes = Array.from({ length: Math.max(LANE_TRACKS, this.lanes()) }, (_, i) =>
      i < this.lanes() ? '2.75rem' : '0rem',
    );
    return `0.5rem 0.375rem 0.25rem ${lanes.join(' ')} minmax(0.25rem, 1fr)`;
  });

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

  /** The whole run of days off. */
  protected dateRange(block: TimeOffBlock): string {
    return formatDateRange(block.from, block.to, this.locale);
  }
}
