import { Component, inject, input, output, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { TimeOffApproval } from '../../core/models';
import { TimeOffService } from '../../core/time-off.service';
import { ToastService } from '../../shared/toast.service';
import { TimeOffSummary } from './time-off-summary';

/** Declines a time off request with a reason, which the person sees on My work. */
@Component({
  selector: 'app-decline-dialog',
  imports: [FormField, TimeOffSummary],
  template: `
    <form class="px-6 pb-6" novalidate (submit)="decline($event)">
      <app-time-off-summary class="rounded-control bg-page p-4" [request]="request()" />

      <div class="mt-6">
        <label class="form-label" for="decline-reason">Reason</label>
        <textarea id="decline-reason" class="form-input" rows="4" [formField]="declineForm.reason"></textarea>
        @if (declineForm.reason().touched() && declineForm.reason().invalid()) {
          <p class="field-error">{{ declineForm.reason().errors()[0].message }}</p>
        }
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="closed.emit()">Cancel</button>
        <button type="submit" class="btn-primary" [disabled]="declineForm().submitting()">Decline</button>
      </div>
    </form>
  `,
})
export class DeclineDialog {
  private readonly timeOff = inject(TimeOffService);
  private readonly toast = inject(ToastService);

  readonly request = input.required<TimeOffApproval>();
  readonly done = output<void>();
  readonly closed = output<void>();

  protected readonly model = signal({ reason: '' });

  protected readonly declineForm = form(this.model, (decline) => {
    required(decline.reason, { message: 'Tell them why.' });
    maxLength(decline.reason, 500, { message: 'Keep the reason under 500 characters.' });
  });

  protected async decline(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.declineForm, async () => {
      try {
        await this.timeOff.decline(this.request().id, this.model().reason.trim());
        this.toast.show('Time off declined.', 'success');
        this.done.emit();
      } catch (error) {
        this.toast.error(error);
      }
      return undefined;
    });
  }
}
