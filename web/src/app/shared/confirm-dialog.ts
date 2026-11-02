import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, input, output } from '@angular/core';

/** Asks before something that moves other things with it: cancel it, or confirm. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [CdkTrapFocus],
  template: `
    <div
      class="w-80 rounded-card bg-surface p-6 shadow-raised"
      role="alertdialog"
      aria-labelledby="confirm-heading"
      aria-describedby="confirm-text"
      cdkTrapFocus
      [cdkTrapFocusAutoCapture]="true"
    >
      <h2 id="confirm-heading" class="font-display text-base font-semibold">{{ heading() }}</h2>
      <p id="confirm-text" class="mt-2 text-sm text-ink-muted">{{ message() }}</p>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="cancelled.emit()">Cancel</button>
        <button type="button" class="btn-primary" (click)="confirmed.emit()">{{ confirmLabel() }}</button>
      </div>
    </div>
  `,
})
export class ConfirmDialog {
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly cancelled = output<void>();
  readonly confirmed = output<void>();
}
