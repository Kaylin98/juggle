import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, input, output } from '@angular/core';

/** A panel that slides over the page from the right. Closes on Escape, the backdrop or the close button. */
@Component({
  selector: 'app-drawer',
  imports: [CdkTrapFocus],
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <button
      type="button"
      class="fixed inset-0 z-40 cursor-default bg-ink/15"
      tabindex="-1"
      aria-label="Close"
      (click)="closed.emit()"
    ></button>
    <aside
      class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-hidden rounded-l-card bg-surface shadow-raised"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="heading()"
      cdkTrapFocus
      [cdkTrapFocusAutoCapture]="true"
    >
      <header class="flex items-center justify-between px-6 pt-6 pb-2">
        <h2 class="label-caps font-sans">{{ heading() }}</h2>
        <button
          type="button"
          class="rounded-control p-1 text-ink-faint hover:bg-surface-muted hover:text-ink focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
          aria-label="Close"
          (click)="closed.emit()"
        >
          <!-- Heroicons x-mark (mini, MIT) -->
          <svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
            />
          </svg>
        </button>
      </header>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <ng-content />
      </div>
    </aside>
  `,
})
export class Drawer {
  readonly heading = input.required<string>();
  readonly closed = output<void>();
}
