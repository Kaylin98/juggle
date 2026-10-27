import { Component, inject } from '@angular/core';
import { ToastKind, ToastService } from './toast.service';

const DOT_CLASSES: Record<ToastKind, string> = {
  success: 'bg-ok-500',
  warning: 'bg-warn-500',
  error: 'bg-over-500',
};

/** Shows the current toasts at the bottom centre, clear of the drawer's buttons. */
@Component({
  selector: 'app-toasts',
  template: `
    <div
      class="fixed bottom-6 left-1/2 z-60 flex w-80 -translate-x-1/2 flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="flex items-start gap-3 rounded-control bg-surface px-4 py-3 text-sm text-ink shadow-raised">
          <span class="mt-1.5 size-2 shrink-0 rounded-full" [class]="dotClasses[toast.kind]"></span>
          <p class="flex-1">{{ toast.message }}</p>
          <button
            type="button"
            class="font-semibold text-ink-faint hover:text-ink"
            aria-label="Dismiss"
            (click)="toastService.dismiss(toast.id)"
          >
            &times;
          </button>
        </div>
      }
    </div>
  `,
})
export class Toasts {
  protected readonly toastService = inject(ToastService);
  protected readonly dotClasses = DOT_CLASSES;
}
