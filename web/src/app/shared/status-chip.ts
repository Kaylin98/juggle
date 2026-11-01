import { Component, input } from '@angular/core';

/** A job's detailed status, in its status's hue (D69). */
@Component({
  selector: 'app-status-chip',
  host: {
    class: 'hue-tint hue-ink inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
    '[style.--hue]': 'colour()',
  },
  template: `{{ name() }}`,
})
export class StatusChip {
  readonly name = input.required<string>();
  /** One of the 8 palette hues. */
  readonly colour = input.required<string>();
}
