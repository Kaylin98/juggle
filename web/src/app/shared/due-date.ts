import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Tooltip } from './tooltip';

/** A required date: red with a dot when the job is overdue, muted otherwise. */
@Component({
  selector: 'app-due-date',
  imports: [DatePipe, Tooltip],
  template: `
    <span
      class="inline-flex items-center gap-1.5 whitespace-nowrap"
      [class]="overdue() ? 'font-semibold text-over-700' : 'text-ink-muted'"
      [appTooltip]="overdue() ? 'Overdue' : 'Deadline'"
    >
      @if (overdue()) {
        <span class="size-1.5 rounded-full bg-over-500"></span>
      }
      {{ date() | date: format() }}
    </span>
  `,
})
export class DueDate {
  readonly date = input.required<string>();
  readonly overdue = input(false);
  readonly format = input('d MMM');
}
