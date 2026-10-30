import { DatePipe } from '@angular/common';
import { Component, ElementRef, afterEveryRender, computed, input, output, signal, viewChild } from '@angular/core';
import { Allocation, Schedule } from '../../core/models';
import { isoWeek } from '../../shared/dates';
import { BarGrip } from './allocation-bar';
import { Dated, dayColumn } from './grid-layout';
import { clashDays, withBookings } from './live-load';
import { PersonRow } from './person-row';
import { ScheduleDrag, draggedAllocation, selectedDays } from './schedule-drag';
import { SnapAnimation } from './snap-animation';

/** How far, in pixels, the pointer moves on a booking before a press is a drag rather than a click. */
const DRAG_THRESHOLD = 3;

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
 * booking to move it (to other days or another person), on its end grips to resize it. A press that moves less
 * than the drag threshold is a click, which opens a booking. Esc cancels a drag.
 *
 * The dragged booking is its own preview: the grid shows the bookings as the drop would leave them, snapped to
 * whole days, so stacking, availability strips and utilisation follow the drag live, worked out from the
 * schedule's data (nothing is saved until release). `SnapAnimation` eases each snap.
 */
@Component({
  selector: 'app-capacity-grid',
  imports: [DatePipe, PersonRow],
  host: {
    '[class]': 'hostClass()',
    '(pointerdown)': 'press($event)',
    '(pointermove)': 'track($event)',
    '(pointerup)': 'release($event)',
    '(pointercancel)': 'reset()',
    '(document:keydown.escape)': 'reset()',
    '(keydown.enter)': 'openWithKeyboard($event)',
  },
  template: `
    <div #grid class="relative grid w-full" [style.grid-template-columns]="columns()" [style.min-width.rem]="minWidth()">
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
      @for (person of people(); track person.id; let i = $index) {
        <app-person-row
          [style.grid-row]="i + 2"
          [person]="person"
          [allocations]="allocationsByPerson().get(person.id) ?? []"
          [editable]="editable()"
          [draft]="draft()?.personId === person.id ? draft() : null"
          [highlighted]="targetRow() === person.id"
          [held]="held()"
          [overbooked]="overbookedRow() === person.id"
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
  /** Days picked for a new booking whose popover is open, kept in place. */
  readonly pending = input<NewBooking | null>(null);
  /** The person a dropped booking would put over capacity, while the page asks whether to book it anyway. */
  readonly overbooked = input<string | null>(null);

  readonly created = output<{ booking: NewBooking; origin: PopoverOrigin }>();
  readonly changed = output<{ allocation: Allocation; origin: PopoverOrigin }>();
  readonly opened = output<{ allocation: Allocation; origin: PopoverOrigin }>();

  private readonly gridElement = viewChild.required<ElementRef<HTMLElement>>('grid');
  private readonly snapAnimation = new SnapAnimation();

  /** The drag, snapped to the cell under the pointer. */
  private readonly drag = signal<ScheduleDrag | null>(null);
  /** The pointer has moved past the threshold, so a press on a booking is a drag, not a click. */
  private readonly dragging = signal(false);
  private pressedAt = { x: 0, y: 0 };
  private pointer = { x: 0, y: 0 };
  private frame = 0;

  constructor() {
    afterEveryRender(() => {
      const { days, people } = this.schedule();
      this.snapAnimation.settle(this.gridElement().nativeElement, `${days[0]}:${days.length}:${people.map((p) => p.id)}`);
    });
  }

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

  /** Where the drag would leave the booking it holds, once it is a drag. */
  private readonly dragged = computed(() => {
    const drag = this.drag();
    if (!drag || drag.kind === 'create' || !this.dragging()) return null;
    return draggedAllocation(drag, this.schedule().days) ?? drag.allocation;
  });

  /** The bookings as shown: the dragged one where the drop would leave it. */
  private readonly shown = computed(() => {
    const dragged = this.dragged();
    const allocations = this.schedule().allocations;
    return dragged ? allocations.map((a) => (a.id === dragged.id ? dragged : a)) : allocations;
  });

  protected readonly allocationsByPerson = computed(() => {
    const byPerson = new Map<string, Allocation[]>();
    for (const allocation of this.shown()) {
      byPerson.set(allocation.personId, [...(byPerson.get(allocation.personId) ?? []), allocation]);
    }
    return byPerson;
  });

  /** Everyone's day loads, added up from the bookings as shown, so a drag's effect shows before it is saved. */
  protected readonly people = computed(() =>
    this.schedule().people.map((person) => ({
      ...person,
      days: withBookings(person.days, this.allocationsByPerson().get(person.id) ?? []),
    })),
  );

  /** Days picked for a new booking: while dragging across empty days, then while its popover is open. */
  protected readonly draft = computed<(Dated & { personId: string }) | null>(() => {
    const drag = this.drag();
    if (drag?.kind !== 'create') return this.pending();
    const days = this.schedule().days;
    const { start, end } = selectedDays(drag);
    return { personId: drag.personId, startDate: days[start], endDate: days[end] };
  });

  /** The booking the pointer holds: by its body, from the press on, or by one end. */
  protected readonly held = computed<{ id: string; grip: BarGrip } | null>(() => {
    const drag = this.drag();
    if (!drag || drag.kind === 'create') return null;
    return { id: drag.allocation.id, grip: drag.kind === 'move' ? 'body' : drag.edge };
  });

  /** The row a booking is being moved to. */
  protected readonly targetRow = computed(() => {
    const drag = this.drag();
    return drag?.kind === 'move' && this.dragging() ? drag.personId : null;
  });

  /** The person the dragged booking would put over capacity where it is now, or the one the page is asking about. */
  protected readonly overbookedRow = computed(() => {
    const dragged = this.dragged();
    const person = dragged && this.people().find((p) => p.id === dragged.personId);
    return person && clashDays(dragged, person.days).length > 0 ? person.id : this.overbooked();
  });

  /** While a booking is held, its cursor shows wherever the pointer goes. */
  protected readonly hostClass = computed(() => {
    const grip = this.held()?.grip;
    const cursor = !grip ? '' : grip === 'body' ? 'cursor-grabbing **:cursor-grabbing!' : 'cursor-ew-resize **:cursor-ew-resize!';
    return `${this.editable() ? 'select-none' : ''} ${cursor}`;
  });

  /** The grid column of a weekday, after the people column. */
  protected column(index: number): number {
    return dayColumn(index) + 2;
  }

  protected press(event: PointerEvent): void {
    const cell = this.cellAt(event.clientX, event.clientY);
    if (!this.editable() || event.button !== 0 || !cell) return;

    const target = event.target as Element;
    const allocation = this.findAllocation(target.closest<HTMLElement>('[data-allocation-id]'));
    const edge = target.closest<HTMLElement>('[data-edge]')?.dataset['edge'] as 'start' | 'end' | undefined;
    const drag: ScheduleDrag =
      allocation && edge
        ? { kind: 'resize', allocation, edge, current: cell.index }
        : allocation
          ? { kind: 'move', allocation, personId: cell.personId, grab: cell.index, current: cell.index }
          : { kind: 'create', personId: cell.personId, anchor: cell.index, current: cell.index };

    this.drag.set(drag);
    // A new booking shows from the first cell; a booking waits for the threshold, so a click still opens it.
    this.dragging.set(drag.kind === 'create');
    this.pressedAt = this.pointer = { x: event.clientX, y: event.clientY };
    // Keep receiving the pointer when it leaves the grid; no text selection while dragging.
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  /** Keeps the latest pointer position; it is snapped in the next animation frame. */
  protected track(event: PointerEvent): void {
    if (!this.drag()) return;
    this.pointer = { x: event.clientX, y: event.clientY };
    this.frame ||= requestAnimationFrame(() => this.snapToPointer());
  }

  protected release(event: PointerEvent): void {
    const pressed = this.drag();
    if (!pressed) return;
    const dragging = this.dragging();
    // The last pointer move may still be waiting for its frame.
    const cell = dragging && this.cellAt(event.clientX, event.clientY);
    if (cell) this.snap(pressed, cell);
    const drag = this.drag()!;
    const dragged = this.dragged();
    this.reset();

    const origin = { x: event.clientX, y: event.clientY };
    const days = this.schedule().days;
    if (drag.kind === 'create') {
      const { start, end } = selectedDays(drag);
      this.created.emit({ booking: { personId: drag.personId, startDate: days[start], endDate: days[end] }, origin });
    } else if (!dragging) {
      this.opened.emit({ allocation: drag.allocation, origin });
    } else if (dragged && dragged !== drag.allocation) {
      this.changed.emit({ allocation: dragged, origin });
    }
  }

  /** Ends a drag without a change, putting everything back: on release, Esc, or the browser taking the pointer. */
  protected reset(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.drag.set(null);
    this.dragging.set(false);
  }

  protected openWithKeyboard(event: Event): void {
    const bar = (event.target as Element).closest<HTMLElement>('[data-allocation-id]');
    const allocation = this.findAllocation(bar);
    if (bar && allocation) this.opened.emit({ allocation, origin: bar });
  }

  /** Once per frame: past the threshold, snaps the drag to the cell under the pointer. */
  private snapToPointer(): void {
    this.frame = 0;
    const drag = this.drag();
    if (!drag) return;
    const { x, y } = this.pointer;
    if (!this.dragging()) {
      if (Math.hypot(x - this.pressedAt.x, y - this.pressedAt.y) < DRAG_THRESHOLD) return;
      this.dragging.set(true);
    }
    const cell = this.cellAt(x, y);
    if (cell) this.snap(drag, cell);
  }

  /** Sets the drag's cell when it changes. A new booking stays in its row; a moved booking can change row. */
  private snap(drag: ScheduleDrag, cell: { personId: string; index: number }): void {
    if (drag.kind === 'move') {
      if (cell.index !== drag.current || cell.personId !== drag.personId) {
        this.drag.set({ ...drag, personId: cell.personId, current: cell.index });
      }
    } else if (cell.index !== drag.current) {
      this.drag.set({ ...drag, current: cell.index });
    }
  }

  /** The day cell under the pointer, if any. Bookings and time off sit above the cells, so look through them. */
  private cellAt(x: number, y: number): { personId: string; index: number } | null {
    const cell = document
      .elementsFromPoint(x, y)
      .find((element): element is HTMLElement => element instanceof HTMLElement && 'dayIndex' in element.dataset);
    const personId = cell?.closest<HTMLElement>('[data-person-id]')?.dataset['personId'];
    return cell && personId ? { personId, index: Number(cell.dataset['dayIndex']) } : null;
  }

  private findAllocation(bar: HTMLElement | null): Allocation | undefined {
    const id = bar?.dataset['allocationId'];
    return id ? this.schedule().allocations.find((a) => a.id === id) : undefined;
  }
}
