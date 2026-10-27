import { Component, computed, input } from '@angular/core';
import { Allocation } from '../../core/models';
import { formatHours } from '../../shared/load-colour';

/** One allocation: project colour, name and hours/day. Another team's work is greyed. */
@Component({
  selector: 'app-allocation-bar',
  host: {
    class: 'mx-px flex h-6 min-w-0 items-center gap-1 rounded px-1.5 text-xs font-medium',
    '[class.bg-slate-200]': 'allocation().otherTeam',
    '[class.text-slate-500]': 'allocation().otherTeam',
    '[class.text-white]': '!allocation().otherTeam',
    '[style.background-color]': 'allocation().otherTeam ? null : allocation().projectColour',
    '[attr.title]': 'title()',
  },
  template: `
    <span class="truncate">{{ allocation().projectName }}</span>
    <span class="ml-auto shrink-0 opacity-80">{{ hours() }}h</span>
  `,
})
export class AllocationBar {
  readonly allocation = input.required<Allocation>();

  protected readonly hours = computed(() => formatHours(this.allocation().hoursPerDay));

  protected readonly title = computed(() => {
    const a = this.allocation();
    const owner = a.otherTeam ? " (another team's project)" : '';
    return `${a.projectName}${owner}: ${this.hours()}h/day, ${a.startDate} to ${a.endDate}`;
  });
}
