import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, LOCALE_ID, computed, inject, input, output } from '@angular/core';
import { clashDaysText } from '../../shared/clash-message';

/** Asks before a booking puts someone over capacity (D16): cancel it, or book it as overtime. */
@Component({
  selector: 'app-clash-dialog',
  imports: [CdkTrapFocus],
  template: `
    <div
      class="w-80 rounded-card bg-surface p-6 shadow-raised"
      role="alertdialog"
      aria-labelledby="clash-heading"
      aria-describedby="clash-text"
      cdkTrapFocus
      [cdkTrapFocusAutoCapture]="true"
    >
      <h2 id="clash-heading" class="flex items-center gap-2 font-display text-base font-semibold">
        <svg class="size-5 text-warn-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clip-rule="evenodd"
          />
        </svg>
        Booking clash
      </h2>
      <p id="clash-text" class="mt-2 text-sm text-ink-muted">{{ message() }}</p>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="cancelled.emit()">Cancel</button>
        <button type="button" class="btn-primary" (click)="confirmed.emit()">Book with overtime</button>
      </div>
    </div>
  `,
})
export class ClashDialog {
  private readonly locale = inject(LOCALE_ID);

  readonly personName = input.required<string>();
  readonly days = input.required<string[]>();
  readonly cancelled = output<void>();
  readonly confirmed = output<void>();

  /** For example "Lerato Mokoena is over capacity on Mon 2 Nov and Tue 3 Nov." */
  protected readonly message = computed(
    () => `${this.personName()} is over capacity on ${clashDaysText(this.days(), this.locale)}.`,
  );
}
