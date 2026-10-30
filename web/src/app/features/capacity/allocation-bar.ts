import { formatDate } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, input } from '@angular/core';
import { Allocation } from '../../core/models';
import { formatHours } from '../../shared/load-colour';

/** The part of a booking the pointer holds on the grid: its body, to move it, or one end, to resize it. */
export type BarGrip = 'body' | 'start' | 'end';

/**
 * One booking: hours/day, then project and department, on a soft tint of the project colour. Another team's work
 * is greyed. An editable bar can be dragged (the grid handles the pointer), resized by the grips at the booking's
 * start and end, and opened with Enter. While held it lifts above the other bookings.
 */
@Component({
  selector: 'app-allocation-bar',
  host: {
    class: 'group relative mx-0.5 mb-1 flex min-w-0 flex-col justify-center rounded-bar border-l-3 px-2 leading-tight',
    '[class.z-10]': '!held()',
    '[class.z-15]': 'held()',
    '[class.hue-tint]': '!allocation().otherTeam',
    '[class.hue-edge]': '!allocation().otherTeam',
    '[class.text-ink]': '!allocation().otherTeam',
    '[class.bg-surface-muted]': 'allocation().otherTeam',
    '[class.border-line-strong]': 'allocation().otherTeam',
    '[class.text-ink-muted]': 'allocation().otherTeam',
    '[class]': 'pointerClass()',
    '[style.--hue]': 'allocation().projectColour',
    '[attr.title]': 'title()',
    '[attr.data-allocation-id]': 'editable() ? allocation().id : null',
    '[attr.data-booking]': 'allocation().id',
    '[attr.tabindex]': 'editable() ? 0 : null',
    '[attr.role]': "editable() ? 'button' : null",
  },
  template: `
    <span class="truncate text-xs font-semibold">{{ hours() }}h/day</span>
    <span class="truncate text-[11px]">{{ allocation().projectName }} &middot; {{ allocation().projectDepartment }}</span>
    @if (editable()) {
      @if (first()) {
        <span class="absolute inset-y-0 left-0 flex w-2.5 cursor-ew-resize items-center justify-center" data-edge="start">
          <span class="h-4 w-1 rounded-full" [class]="grip('start')"></span>
        </span>
      }
      @if (last()) {
        <span class="absolute inset-y-0 right-0 flex w-2.5 cursor-ew-resize items-center justify-center" data-edge="end">
          <span class="h-4 w-1 rounded-full" [class]="grip('end')"></span>
        </span>
      }
    }
  `,
})
export class AllocationBar {
  private readonly locale = inject(LOCALE_ID);

  readonly allocation = input.required<Allocation>();
  readonly editable = input(false);
  /** This piece holds the booking's start, so it gets the start grip. */
  readonly first = input(true);
  /** This piece holds the booking's end, so it gets the end grip. */
  readonly last = input(true);
  /** The part the pointer holds while this booking is dragged. */
  readonly held = input<BarGrip | null>(null);

  /** Held, the bar lifts for the whole drag: a deeper shadow, and a little larger when moved. */
  protected readonly pointerClass = computed(() => {
    if (!this.editable()) return '';
    const base =
      'transition-[scale,box-shadow] duration-150 focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none motion-reduce:transition-none';
    const held = this.held();
    if (held === 'body') return `${base} scale-102 cursor-grabbing shadow-raised`;
    return held ? `${base} cursor-ew-resize shadow-raised` : `${base} cursor-grab hover:shadow-lifted`;
  });

  protected readonly hours = computed(() => formatHours(this.allocation().hoursPerDay));

  /** For example "Q1 Campaign · Marketing (Design team): 4h/day, 12 Oct to 20 Nov". */
  protected readonly title = computed(() => {
    const a = this.allocation();
    const from = formatDate(a.startDate, 'd MMM', this.locale);
    const to = formatDate(a.endDate, 'd MMM', this.locale);
    return `${a.projectName} · ${a.projectDepartment} (${a.teamName} team): ${this.hours()}h/day, ${from} to ${to}`;
  });

  /** A resize grip shows on hover, and in the accent while its end is dragged; hidden while the bar is moved. */
  protected grip(edge: 'start' | 'end'): string {
    const held = this.held();
    if (held === edge) return 'bg-accent-500';
    return held ? 'opacity-0' : 'bg-ink-faint opacity-0 group-hover:opacity-100';
  }
}
