import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { Allocation, Schedule } from '../../core/models';
import { PersonRow } from './person-row';

// One column for people, then one per weekday. Full class names so Tailwind generates them.
const COLUMNS: Record<number, string> = {
  1: 'grid-cols-[13rem_repeat(5,minmax(7rem,1fr))]',
  2: 'grid-cols-[13rem_repeat(10,minmax(4.5rem,1fr))]',
  4: 'grid-cols-[13rem_repeat(20,minmax(2.5rem,1fr))]',
};

/** People x weekdays. Built as a CSS grid; each row and the header use subgrid to share the columns. */
@Component({
  selector: 'app-capacity-grid',
  imports: [DatePipe, PersonRow],
  template: `
    <div class="grid min-w-fit" [class]="columns()">
      <div class="sticky top-0 z-30 col-span-full grid grid-cols-subgrid border-b border-slate-200 bg-white">
        <div class="sticky left-0 border-r border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500">
          {{ schedule().people.length }} people
        </div>
        @for (day of schedule().days; track day; let i = $index) {
          <div
            class="border-l py-1.5 text-center"
            [class.border-slate-300]="i % 5 === 0"
            [class.border-slate-100]="i % 5 !== 0"
            [class.bg-accent-50]="day === today()"
          >
            <div class="text-[11px] text-slate-500 uppercase">{{ day | date: (compact() ? 'EEEEE' : 'EEE') }}</div>
            <div class="text-sm font-semibold" [class.text-accent-600]="day === today()">
              {{ day | date: (i % 5 === 0 && !compact() ? 'd MMM' : 'd') }}
            </div>
          </div>
        }
      </div>

      @for (person of schedule().people; track person.id) {
        <app-person-row
          [person]="person"
          [allocations]="allocationsByPerson().get(person.id) ?? []"
          [days]="schedule().days"
          [today]="today()"
          [compact]="compact()"
        />
      } @empty {
        <p class="col-span-full px-4 py-6 text-sm text-slate-500">Nobody in this team has a schedule yet.</p>
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

  protected readonly allocationsByPerson = computed(() => {
    const byPerson = new Map<string, Allocation[]>();
    for (const allocation of this.schedule().allocations) {
      byPerson.set(allocation.personId, [...(byPerson.get(allocation.personId) ?? []), allocation]);
    }
    return byPerson;
  });
}
