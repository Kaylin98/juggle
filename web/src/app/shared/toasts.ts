import { Component, inject } from '@angular/core';
import { ToastKind, ToastService } from './toast.service';

const KIND_CLASSES: Record<ToastKind, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-red-200 bg-red-50 text-red-800',
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
        <div class="flex items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-md" [class]="kindClasses[toast.kind]">
          <p class="flex-1">{{ toast.message }}</p>
          <button
            type="button"
            class="font-medium opacity-60 hover:opacity-100"
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
  protected readonly kindClasses = KIND_CLASSES;
}
