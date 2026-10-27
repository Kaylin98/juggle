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
      class="fixed inset-0 z-40 cursor-default bg-slate-900/20"
      tabindex="-1"
      aria-label="Close"
      (click)="closed.emit()"
    ></button>
    <aside
      class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="heading()"
      cdkTrapFocus
      [cdkTrapFocusAutoCapture]="true"
    >
      <header class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 class="text-base font-semibold">{{ heading() }}</h2>
        <button
          type="button"
          class="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
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
