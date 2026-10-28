import { DatePipe } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { Allocation, Schedule } from '../../core/models';
import { isoWeek } from '../../shared/dates';
import { dayColumn } from './grid-layout';
import { PersonRow } from './person-row';
import { ScheduleDrag, draggedAllocation, selectedDays } from './schedule-drag';

/** Where a popover opens: the pointer, or the booking opened with the keyboard. */
export type PopoverOrigin = Element | { x: number; y: number };

/** Days picked for a new booking. */
export interface NewBooking {
  personId: string;
  startDate: string;
  endDate: string;
}

/**
 * People x days. Built as a CSS grid: the people column, then per week five fixed-width day columns and a
 * narrow weekend column. Each row and the header use subgrid to share the columns.
 *
 * When editable, pointer drags book and change work: across empty cells to pick days for a new booking, on a
 * booking to move it (to other days or another person), on its end handles to resize it. A click opens a booking.
 * The grid shows the result while dragging and emits it on release; the page saves it.
 */
@Component({
  selector: 'app-capacity-grid',
  imports: [DatePipe, PersonRow],
  host: {
    '[class.select-none]': 'editable()',
    '(pointerdown)': 'press($event)',
    '(pointermove)': 'track($event)',
    '(pointerup)': 'release($event)',
    '(pointercancel)': 'drag.set(null)',
    '(keydown.enter)': 'openWithKeyboard($event)',
  },
  template: `
    <div class="grid w-full" [style.grid-template-columns]="columns()" [style.min-width.rem]="minWidth()">
      <div class="sticky top-0 z-30 col-span-full grid grid-cols-subgrid border-b border-line bg-surface">
        <div class="sticky left-0 z-10 row-span-2 flex items-end justify-between border-r border-line bg-surface px-4 py-3">
          <span class="label-caps">{{ schedule().people.length }} people</span>
          <span class="label-caps" title="Utilisation over the days shown">Util.</span>
        </div>

        @for (week of weeks(); track week.monday) {
          <div
            class="row-start-1 border-l border-ink-faint px-2 pt-3 pb-1 whitespace-nowrap"
            [style.grid-column]="week.column + ' / span 6'"
          >
            <!-- Sticks beside the people column while the week scrolls under it. -->
            <span class="sticky left-[calc(18rem+0.5rem)] inline-block">
              <span class="label-caps text-ink">W{{ week.number }}</span>
              <span class="ml-2 text-xs text-ink-muted">{{ week.monday | date: 'd MMM' }}</span>
            </span>
          </div>
          <div class="row-start-2 bg-surface-muted" [style.grid-column]="week.column + 5"></div>
        }

        @for (day of schedule().days; track day; let i = $index) {
          <div
            class="row-start-2 border-l pt-1 pb-2 text-center"
            [class]="i % 5 === 0 ? 'border-ink-faint' : 'border-line'"
            [class.bg-accent-50]="day === today()"
            [style.grid-column]="column(i)"
          >
            <div class="label-caps" [class.text-accent-600]="day === today()">{{ day | date: 'EEE' }}</div>
            <div class="mt-0.5 font-display text-sm font-semibold" [class.text-accent-600]="day === today()">
              {{ day | date: 'd' }}
            </div>
          </div>
        }
      </div>

      <!-- Rows are placed explicitly so the today tint can span them. -->
      @for (person of schedule().people; track person.id; let i = $index) {
        <app-person-row
          [style.grid-row]="i + 2"
          [person]="person"
          [allocations]="allocationsByPerson().get(person.id) ?? []"
          [editable]="editable()"
          [selection]="selectionFor(person.id)"
        />
      } @empty {
        <p class="col-span-full px-4 py-12 text-center text-sm text-ink-muted">Nobody in this team has a schedule yet.</p>
      }

      @if (todayIndex() !== -1) {
        <div
          class="pointer-events-none z-0 bg-accent-50 mix-blend-multiply"
          [style.grid-column]="column(todayIndex())"
          [style.grid-row]="'2 / span ' + schedule().people.length"
        ></div>
      }
    </div>
  `,
})
export class CapacityGrid {
  readonly schedule = input.required<Schedule>();
  readonly today = input.required<string>();
  /** The viewer can book and change this team's work: Team Admins, and Org Admins on "All teams" (D24, D25). */
  readonly editable = input(false);
  /** Days picked for a new booking whose popover is open, kept highlighted. */
  readonly pending = input<NewBooking | null>(null);

  readonly created = output<{ booking: NewBooking; origin: PopoverOrigin }>();
  readonly changed = output<Allocation>();
  readonly opened = output<{ allocation: Allocation; origin: PopoverOrigin }>();

  protected readonly drag = signal<ScheduleDrag | null>(null);

  private readonly weekCount = computed(() => this.schedule().days.length / 5);

  /**
   * The 18rem people column, then per week five days that share the width (at least 56px each) and a fixed
   * 20px weekend column. CSS cannot nest repeat(), so the week's tracks are written out.
   */
  protected readonly columns = computed(
    () => `18rem repeat(${this.weekCount()}, ${'minmax(3.5rem, 1fr) '.repeat(5)}1.25rem)`,
  );

  /** Below this width the days would shrink past their minimum, so the panel scrolls instead. */
  protected readonly minWidth = computed(() => 18 + this.weekCount() * (5 * 3.5 + 1.25));

  /** Each week's Monday, ISO week number and first grid column. */
  protected readonly weeks = computed(() =>
    this.schedule()
      .days.filter((_, i) => i % 5 === 0)
      .map((monday, w) => ({ monday, number: isoWeek(monday), column: w * 6 + 2 })),
  );

  protected readonly todayIndex = computed(() => this.schedule().days.indexOf(this.today()));

  /** The bookings as shown: the one being moved or resized is drawn where the drag would leave it. */
  private readonly shown = computed(() => {
    const drag = this.drag();
    const allocations = this.schedule().allocations;
    const dragged = drag && drag.kind !== 'create' ? draggedAllocation(drag, this.schedule().days) : null;
    return dragged ? allocations.map((a) => (a.id === dragged.id ? dragged : a)) : allocations;
  });

  protected readonly allocationsByPerson = computed(() => {
    const byPerson = new Map<string, Allocation[]>();
    for (const allocation of this.shown()) {
      byPerson.set(allocation.personId, [...(byPerson.get(allocation.personId) ?? []), allocation]);
    }
    return byPerson;
  });

  /** The grid column of a weekday, after the people column. */
  protected column(index: number): number {
    return dayColumn(index) + 2;
  }

  protected selectionFor(personId: string): { start: number; end: number } | null {
    const drag = this.drag();
    if (drag?.kind === 'create') return drag.personId === personId ? selectedDays(drag) : null;
    const pending = this.pending();
    if (pending?.personId !== personId) return null;
    const days = this.schedule().days;
    return { start: days.indexOf(pending.startDate), end: days.indexOf(pending.endDate) };
  }

  protected press(event: PointerEvent): void {
    const cell = this.cellAt(event);
    if (!this.editable() || event.button !== 0 || !cell) return;

    const target = event.target as Element;
    const allocation = this.findAllocation(target.closest<HTMLElement>('[data-allocation-id]'));
    const edge = target.closest<HTMLElement>('[data-edge]')?.dataset['edge'] as 'start' | 'end' | undefined;
    if (allocation && edge) {
      this.drag.set({ kind: 'resize', allocation, edge, current: cell.index });
    } else if (allocation) {
      this.drag.set({ kind: 'move', allocation, personId: cell.personId, grab: cell.index, current: cell.index });
    } else {
      this.drag.set({ kind: 'create', personId: cell.personId, anchor: cell.index, current: cell.index });
    }
    // Keep receiving the pointer when it leaves the grid; no text selection while dragging.
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  /** Follows the pointer cell by cell. A new booking stays in its row; a moved booking can change row. */
  protected track(event: PointerEvent): void {
    const drag = this.drag();
    const cell = drag && this.cellAt(event);
    if (!drag || !cell) return;
    if (drag.kind === 'move') this.drag.set({ ...drag, personId: cell.personId, current: cell.index });
    else this.drag.set({ ...drag, current: cell.index });
  }

  protected release(event: PointerEvent): void {
    const drag = this.drag();
    if (!drag) return;
    this.drag.set(null);
    const origin = { x: event.clientX, y: event.clientY };
    const days = this.schedule().days;

    if (drag.kind === 'create') {
      const { start, end } = selectedDays(drag);
      this.created.emit({ booking: { personId: drag.personId, startDate: days[start], endDate: days[end] }, origin });
      return;
    }
    const dragged = draggedAllocation(drag, days);
    if (dragged) this.changed.emit(dragged);
    else if (drag.kind === 'move') this.opened.emit({ allocation: drag.allocation, origin });
  }

  protected openWithKeyboard(event: Event): void {
    const bar = (event.target as Element).closest<HTMLElement>('[data-allocation-id]');
    const allocation = this.findAllocation(bar);
    if (bar && allocation) this.opened.emit({ allocation, origin: bar });
  }

  /** The day cell under the pointer, if any. Bookings and time off sit above the cells, so look through them. */
  private cellAt(event: PointerEvent): { personId: string; index: number } | null {
    const cell = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find((element): element is HTMLElement => element instanceof HTMLElement && 'dayIndex' in element.dataset);
    const personId = cell?.closest<HTMLElement>('[data-person-id]')?.dataset['personId'];
    return cell && personId ? { personId, index: Number(cell.dataset['dayIndex']) } : null;
  }

  private findAllocation(bar: HTMLElement | null): Allocation | undefined {
    const id = bar?.dataset['allocationId'];
    return id ? this.schedule().allocations.find((a) => a.id === id) : undefined;
  }
}
