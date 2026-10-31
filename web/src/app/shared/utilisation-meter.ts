import { Component, computed, input } from '@angular/core';
import { PeriodLoad } from '../core/models';
import { UTILISATION_BAR, UTILISATION_TEXT, formatHours, utilisationLevel } from './load-colour';

/** One period's utilisation: the percentage in its load colour, the hours, and a bar (full when over 100%). */
@Component({
  selector: 'app-utilisation-meter',
  host: { class: 'block' },
  template: `
    @if (load().capacity === 0) {
      <div class="text-sm text-ink-muted">No working days</div>
    } @else {
      <div class="flex items-baseline justify-between gap-4">
        <span class="text-sm font-semibold" [class]="text[level()]">{{ percent() }}%</span>
        <span class="text-xs whitespace-nowrap text-ink-muted">{{ hours() }}</span>
      </div>
    }
    <div class="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
      <div class="h-full rounded-full" [class]="bar[level()]" [style.width.%]="width()"></div>
    </div>
  `,
})
export class UtilisationMeter {
  readonly load = input.required<PeriodLoad>();

  protected readonly text = UTILISATION_TEXT;
  protected readonly bar = UTILISATION_BAR;

  protected readonly level = computed(() => utilisationLevel(this.load()));
  private readonly ratio = computed(() => {
    const { allocated, capacity } = this.load();
    return capacity === 0 ? 0 : allocated / capacity;
  });
  protected readonly percent = computed(() => Math.round(this.ratio() * 100));
  protected readonly width = computed(() => Math.min(100, this.ratio() * 100));
  protected readonly hours = computed(() => `${formatHours(this.load().allocated)}h of ${formatHours(this.load().capacity)}h`);
}
