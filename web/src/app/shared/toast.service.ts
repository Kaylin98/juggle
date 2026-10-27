import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'warning' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const DISMISS_AFTER_MS = 5000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;

  readonly toasts = signal<Toast[]>([]);

  show(message: string, kind: ToastKind = 'success'): void {
    const id = this.nextId++;
    this.toasts.update((toasts) => [...toasts, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), DISMISS_AFTER_MS);
  }

  /** Shows the API's ProblemDetails message, or a generic one. */
  error(error: unknown): void {
    const detail =
      error instanceof HttpErrorResponse
        ? (error.error as { detail?: string } | null)?.detail
        : undefined;
    this.show(detail ?? 'Something went wrong. Please try again.', 'error');
  }

  dismiss(id: number): void {
    this.toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }
}
