import { formatDate } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, input } from '@angular/core';
import { Allocation } from '../../core/models';
import { formatHours } from '../../shared/load-colour';

/** One allocation: a soft tint of the project colour with its name and hours/day. Another team's work is greyed. */
@Component({
  selector: 'app-allocation-bar',
  host: {
    class: 'z-10 mx-0.5 flex h-6 min-w-0 items-center rounded-bar border-l-3 px-2 text-xs font-semibold',
    '[class.hue-tint]': '!allocation().otherTeam',
    '[class.hue-edge]': '!allocation().otherTeam',
    '[class.text-ink]': '!allocation().otherTeam',
    '[class.bg-surface-muted]': 'allocation().otherTeam',
    '[class.border-line-strong]': 'allocation().otherTeam',
    '[class.text-ink-muted]': 'allocation().otherTeam',
    '[style.--hue]': 'allocation().projectColour',
    '[attr.title]': 'title()',
  },
  template: `<span class="truncate">{{ allocation().projectName }} &middot; {{ hours() }}h/day</span>`,
})
export class AllocationBar {
  private readonly locale = inject(LOCALE_ID);

  readonly allocation = input.required<Allocation>();

  protected readonly hours = computed(() => formatHours(this.allocation().hoursPerDay));

  /** For example "Q1 Campaign (Design team): 4h/day, 12 Oct to 20 Nov". */
  protected readonly title = computed(() => {
    const a = this.allocation();
    const from = formatDate(a.startDate, 'd MMM', this.locale);
    const to = formatDate(a.endDate, 'd MMM', this.locale);
    return `${a.projectName} (${a.teamName} team): ${this.hours()}h/day, ${from} to ${to}`;
  });
}
