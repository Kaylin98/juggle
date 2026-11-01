import { Component, input } from '@angular/core';
import { ColumnCount } from '../../core/models';

/** The board columns in order, each with its colour swatch, and with its count when asked. */
@Component({
  selector: 'app-status-legend',
  host: { class: 'block' },
  template: `
    <ul class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      @for (column of columns(); track column.columnId) {
        <li class="flex items-center gap-2">
          <span class="size-2.5 rounded-full" [class]="colours().get(column.columnId)"></span>
          <span>{{ column.name }}</span>
          @if (showCounts()) {
            <span class="font-semibold tabular-nums">{{ column.count }}</span>
          }
        </li>
      }
    </ul>
  `,
})
export class StatusLegend {
  readonly columns = input.required<ColumnCount[]>();
  readonly colours = input.required<Map<string, string>>();
  readonly showCounts = input(false);
}
