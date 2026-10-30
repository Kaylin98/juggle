import { Component, inject, input, output, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { WorkRequest } from '../../core/models';
import { RequestsService } from '../../core/requests.service';
import { ToastService } from '../../shared/toast.service';
import { RequestSummary } from './request-summary';

/** Turns a request down with a reason, which the requester sees on the request (D9). */
@Component({
  selector: 'app-reject-dialog',
  imports: [FormField, RequestSummary],
  template: `
    <form class="px-6 pb-6" novalidate (submit)="reject($event)">
      <app-request-summary [request]="request()" />

      <div class="mt-6">
        <label class="form-label" for="reject-reason">Reason</label>
        <textarea id="reject-reason" class="form-input" rows="4" [formField]="rejectForm.reason"></textarea>
        @if (rejectForm.reason().touched() && rejectForm.reason().invalid()) {
          <p class="field-error">{{ rejectForm.reason().errors()[0].message }}</p>
        }
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="closed.emit()">Cancel</button>
        <button type="submit" class="btn-primary" [disabled]="rejectForm().submitting()">Reject</button>
      </div>
    </form>
  `,
})
export class RejectDialog {
  private readonly requests = inject(RequestsService);
  private readonly toast = inject(ToastService);

  readonly request = input.required<WorkRequest>();
  readonly done = output<void>();
  readonly closed = output<void>();

  protected readonly model = signal({ reason: '' });

  protected readonly rejectForm = form(this.model, (reject) => {
    required(reject.reason, { message: 'Tell the requester why.' });
    maxLength(reject.reason, 1000, { message: 'Keep the reason under 1000 characters.' });
  });

  protected async reject(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.rejectForm, async () => {
      try {
        await this.requests.reject(this.request().id, this.model().reason.trim());
        this.toast.show('Request rejected.', 'success');
        this.done.emit();
      } catch (error) {
        this.toast.error(error);
      }
      return undefined;
    });
  }
}
