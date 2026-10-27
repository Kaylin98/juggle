import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { Allocation, Schedule } from '../../core/models';
import { isoWeek } from '../../shared/dates';
import { dayColumn } from './grid-layout';
import { PersonRow } from './person-row';

/**
 * People x days. Built as a CSS grid: the people column, then per week five fixed-width day columns and a
 * narrow weekend column. Each row and the header use subgrid to share the columns.
 */
@Component({
  selector: 'app-capacity-grid',
  imports: [DatePipe, PersonRow],
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

  protected readonly allocationsByPerson = computed(() => {
    const byPerson = new Map<string, Allocation[]>();
    for (const allocation of this.schedule().allocations) {
      byPerson.set(allocation.personId, [...(byPerson.get(allocation.personId) ?? []), allocation]);
    }
    return byPerson;
  });

  /** The grid column of a weekday, after the people column. */
  protected column(index: number): number {
    return dayColumn(index) + 2;
  }
}
