import { DatePipe } from '@angular/common';
import { Component, computed, model } from '@angular/core';
import { addDays, startOfWeek, today } from '../../shared/dates';
import { Weeks } from './capacity.service';

const WEEK_OPTIONS: Weeks[] = [1, 2, 4];

/** Today, previous and next, the date range shown, and the 1, 2 or 4 week toggle. */
@Component({
  selector: 'app-grid-toolbar',
  imports: [DatePipe],
  host: { class: 'flex flex-wrap items-center gap-3' },
  template: `
    <button type="button" class="btn-secondary" (click)="goToToday()">Today</button>
    <div class="flex">
      <button
        type="button"
        class="flex h-9 items-center rounded-l-control border border-line-strong bg-surface px-2 text-ink-muted hover:bg-page hover:text-ink focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
        aria-label="Previous"
        (click)="move(-1)"
      >
        <!-- Heroicons chevron-left (mini, MIT) -->
        <svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
      <button
        type="button"
        class="-ml-px flex h-9 items-center rounded-r-control border border-line-strong bg-surface px-2 text-ink-muted hover:bg-page hover:text-ink focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
        aria-label="Next"
        (click)="move(1)"
      >
        <!-- Heroicons chevron-right (mini, MIT) -->
        <svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
    <span class="min-w-40 font-display text-sm font-semibold">{{ start() | date: 'd MMM' }} &ndash; {{ end() | date: 'd MMM y' }}</span>
    <div class="inline-flex rounded-full border border-line bg-surface p-1 shadow-soft" role="group" aria-label="Weeks shown">
      @for (option of weekOptions; track option) {
        <button
          type="button"
          class="rounded-full px-3 py-1 text-sm font-semibold focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
          [class]="option === weeks() ? 'bg-accent-600 text-white' : 'text-ink-muted hover:text-ink'"
          [attr.aria-pressed]="option === weeks()"
          (click)="weeks.set(option)"
        >
          {{ option }} {{ option === 1 ? 'week' : 'weeks' }}
        </button>
      }
    </div>
  `,
})
export class GridToolbar {
  /** The Monday the schedule starts on. */
  readonly start = model.required<string>();
  readonly weeks = model.required<Weeks>();

  protected readonly weekOptions = WEEK_OPTIONS;

  /** The last Friday shown. */
  protected readonly end = computed(() => addDays(this.start(), this.weeks() * 7 - 3));

  protected goToToday(): void {
    this.start.set(startOfWeek(today()));
  }

  protected move(direction: 1 | -1): void {
    this.start.set(addDays(this.start(), direction * this.weeks() * 7));
  }
}
