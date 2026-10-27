import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { Allocation, Schedule } from '../../core/models';
import { PersonRow } from './person-row';

// One column for people and utilisation, then one per weekday. Full class names so Tailwind generates them.
const COLUMNS: Record<number, string> = {
  1: 'grid-cols-[18rem_repeat(5,minmax(7rem,1fr))]',
  2: 'grid-cols-[18rem_repeat(10,minmax(4.5rem,1fr))]',
  4: 'grid-cols-[18rem_repeat(20,minmax(2.5rem,1fr))]',
};

/** People x weekdays. Built as a CSS grid; each row and the header use subgrid to share the columns. */
@Component({
  selector: 'app-capacity-grid',
  imports: [DatePipe, PersonRow],
  template: `
    <div class="grid min-w-fit" [class]="columns()">
      <div class="sticky top-0 z-30 col-span-full grid grid-cols-subgrid border-b border-line bg-surface">
        <div class="sticky left-0 flex items-end justify-between border-r border-line bg-surface px-4 py-3">
          <span class="label-caps">{{ schedule().people.length }} people</span>
          <span class="label-caps" title="Utilisation over the days shown">Util.</span>
        </div>
        @for (day of schedule().days; track day; let i = $index) {
          <div
            class="border-l py-2 text-center"
            [class]="i % 5 === 0 ? 'border-line-strong' : 'border-line'"
            [class.today-edge]="day === today()"
          >
            <div class="label-caps" [class.text-accent-600]="day === today()">
              {{ day | date: (compact() ? 'EEEEE' : 'EEE') }}
            </div>
            <div class="mt-0.5 font-display text-sm font-semibold" [class.text-accent-600]="day === today()">
              {{ day | date: (i % 5 === 0 && !compact() ? 'd MMM' : 'd') }}
            </div>
          </div>
        }
      </div>

      <!-- Rows are placed explicitly so the today line can span them. -->
      @for (person of schedule().people; track person.id; let i = $index) {
        <app-person-row
          [style.grid-row]="i + 2"
          [person]="person"
          [allocations]="allocationsByPerson().get(person.id) ?? []"
          [days]="schedule().days"
        />
      } @empty {
        <p class="col-span-full px-4 py-12 text-center text-sm text-ink-muted">Nobody in this team has a schedule yet.</p>
      }

      @if (todayColumn(); as column) {
        <div
          class="pointer-events-none z-0 w-0.5 justify-self-start bg-accent-500"
          [style.grid-column]="column"
          [style.grid-row]="'2 / span ' + schedule().people.length"
        ></div>
      }
    </div>
  `,
})
export class CapacityGrid {
  readonly schedule = input.required<Schedule>();
  readonly today = input.required<string>();

  private readonly weeks = computed(() => this.schedule().days.length / 5);
  protected readonly columns = computed(() => COLUMNS[this.weeks()]);
  protected readonly compact = computed(() => this.weeks() === 4);

  /** The grid column of today (after the people column), or null when today is not shown. */
  protected readonly todayColumn = computed(() => {
    const index = this.schedule().days.indexOf(this.today());
    return index === -1 ? null : index + 2;
  });

  protected readonly allocationsByPerson = computed(() => {
    const byPerson = new Map<string, Allocation[]>();
    for (const allocation of this.schedule().allocations) {
      byPerson.set(allocation.personId, [...(byPerson.get(allocation.personId) ?? []), allocation]);
    }
    return byPerson;
  });
}
