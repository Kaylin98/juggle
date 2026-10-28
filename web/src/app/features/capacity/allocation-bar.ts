import { formatDate } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, input } from '@angular/core';
import { Allocation } from '../../core/models';
import { formatHours } from '../../shared/load-colour';

/**
 * One booking: hours/day, then project and department, on a soft tint of the project colour. Another team's work
 * is greyed. An editable bar can be dragged (the grid handles the pointer), resized by the handles at the booking's
 * start and end, and opened with Enter.
 */
@Component({
  selector: 'app-allocation-bar',
  host: {
    class: 'relative z-10 mx-0.5 flex min-w-0 flex-col justify-center rounded-bar border-l-3 px-2 leading-tight',
    '[class.hue-tint]': '!allocation().otherTeam',
    '[class.hue-edge]': '!allocation().otherTeam',
    '[class.text-ink]': '!allocation().otherTeam',
    '[class.bg-surface-muted]': 'allocation().otherTeam',
    '[class.border-line-strong]': 'allocation().otherTeam',
    '[class.text-ink-muted]': 'allocation().otherTeam',
    '[class]': "editable() ? 'cursor-grab hover:shadow-lifted focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none' : ''",
    '[style.--hue]': 'allocation().projectColour',
    '[attr.title]': 'title()',
    '[attr.data-allocation-id]': 'editable() ? allocation().id : null',
    '[attr.tabindex]': 'editable() ? 0 : null',
    '[attr.role]': "editable() ? 'button' : null",
  },
  template: `
    <span class="truncate text-xs font-semibold">{{ hours() }}h/day</span>
    <span class="truncate text-[11px]">{{ allocation().projectName }} &middot; {{ allocation().projectDepartment }}</span>
    @if (editable()) {
      @if (first()) {
        <span class="absolute inset-y-0 -left-0.5 w-2 cursor-ew-resize" data-edge="start"></span>
      }
      @if (last()) {
        <span class="absolute inset-y-0 -right-0.5 w-2 cursor-ew-resize" data-edge="end"></span>
      }
    }
  `,
})
export class AllocationBar {
  private readonly locale = inject(LOCALE_ID);

  readonly allocation = input.required<Allocation>();
  readonly editable = input(false);
  /** This piece holds the booking's start, so it gets the start handle. */
  readonly first = input(true);
  /** This piece holds the booking's end, so it gets the end handle. */
  readonly last = input(true);

  protected readonly hours = computed(() => formatHours(this.allocation().hoursPerDay));

  /** For example "Q1 Campaign · Marketing (Design team): 4h/day, 12 Oct to 20 Nov". */
  protected readonly title = computed(() => {
    const a = this.allocation();
    const from = formatDate(a.startDate, 'd MMM', this.locale);
    const to = formatDate(a.endDate, 'd MMM', this.locale);
    return `${a.projectName} · ${a.projectDepartment} (${a.teamName} team): ${this.hours()}h/day, ${from} to ${to}`;
  });
}
