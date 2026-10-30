import { Component, computed, input } from '@angular/core';
import { PeriodLoad, PersonUtilisation } from '../../core/models';
import { Avatar } from '../../shared/avatar';
import { UTILISATION_BAR, UtilisationLevel } from '../../shared/load-colour';
import { UtilisationMeter } from './utilisation-meter';

const LEGEND: { level: UtilisationLevel; label: string }[] = [
  { level: 'available', label: 'Available, under 50%' },
  { level: 'green', label: 'Under 80%' },
  { level: 'amber', label: '80 to 100%' },
  { level: 'red', label: 'Over 100%' },
];

/** Utilisation per person for this week and the next four (D27), the busiest this week first. */
@Component({
  selector: 'app-utilisation-panel',
  imports: [Avatar, UtilisationMeter],
  host: { class: 'panel block p-6' },
  template: `
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="font-display text-lg font-semibold">Utilisation</h2>
        <p class="mt-1 text-sm text-ink-muted">Booked hours against working hours, after leave and public holidays</p>
      </div>
      <ul class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
        @for (item of legend; track item.level) {
          <li class="flex items-center gap-2">
            <span class="size-2 rounded-full" [class]="bar[item.level]"></span>
            {{ item.label }}
          </li>
        }
      </ul>
    </div>

    <div class="mt-6 grid grid-cols-[minmax(13rem,1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)] gap-x-10">
      <div class="col-span-3 grid grid-cols-subgrid items-baseline pb-3">
        <span class="label-caps">Person</span>
        <div class="flex flex-wrap items-baseline gap-x-2">
          <span class="label-caps whitespace-nowrap">This week</span>
          <span class="text-xs whitespace-nowrap text-ink-muted">{{ thisWeekDates() }}</span>
        </div>
        <div class="flex flex-wrap items-baseline gap-x-2">
          <span class="label-caps whitespace-nowrap">Next 4 weeks</span>
          <span class="text-xs whitespace-nowrap text-ink-muted">{{ nextFourWeeksDates() }}</span>
        </div>
      </div>

      @for (person of sorted(); track person.id) {
        <div class="col-span-3 grid grid-cols-subgrid items-center border-t border-line py-3">
          <div class="flex min-w-0 items-center gap-3">
            <app-avatar [name]="person.name" [colour]="person.avatarColour" />
            <div class="min-w-0 leading-tight">
              <div class="truncate text-sm font-semibold">{{ person.name }}</div>
              <div class="mt-0.5 truncate text-xs text-ink-muted">{{ person.jobTitle }}</div>
            </div>
          </div>
          <div>
            <app-utilisation-meter [load]="person.thisWeek" />
            @if (person.overThisWeek) {
              <div class="mt-1 text-[11px] font-semibold text-over-700">Overbooked</div>
            }
          </div>
          <app-utilisation-meter [load]="person.nextFourWeeks" />
        </div>
      } @empty {
        <p class="col-span-3 border-t border-line pt-6 text-sm text-ink-muted">No one is in this team yet.</p>
      }
    </div>
  `,
})
export class UtilisationPanel {
  readonly people = input.required<PersonUtilisation[]>();
  readonly thisWeekDates = input.required<string>();
  readonly nextFourWeeksDates = input.required<string>();

  protected readonly legend = LEGEND;
  protected readonly bar = UTILISATION_BAR;

  protected readonly sorted = computed(() =>
    [...this.people()].sort((a, b) => ratio(b.thisWeek) - ratio(a.thisWeek) || a.name.localeCompare(b.name)),
  );
}

/** People with no working days sort last. */
function ratio(load: PeriodLoad): number {
  return load.capacity === 0 ? -1 : load.allocated / load.capacity;
}
