import { Component, input } from '@angular/core';
import { StatusCount } from '../../core/models';

/** The statuses in board order, each with its colour swatch, and with its count when asked. */
@Component({
  selector: 'app-status-legend',
  host: { class: 'block' },
  template: `
    <ul class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      @for (status of statuses(); track status.statusId) {
        <li class="flex items-center gap-2">
          <span class="size-2.5 rounded-full" [class]="colours().get(status.statusId)"></span>
          <span>{{ status.name }}</span>
          @if (showCounts()) {
            <span class="font-semibold tabular-nums">{{ status.count }}</span>
          }
        </li>
      }
    </ul>
  `,
})
export class StatusLegend {
  readonly statuses = input.required<StatusCount[]>();
  readonly colours = input.required<Map<string, string>>();
  readonly showCounts = input(false);
}
