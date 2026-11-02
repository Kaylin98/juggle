import { Component, input, output, signal } from '@angular/core';
import { FormField, form, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { BusinessApproval } from '../../core/models';
import { today } from '../../shared/dates';

@Component({
  selector: 'app-business-approval-form',
  imports: [FormField],
  template: `
    <form class="rounded-control bg-surface-muted p-4" novalidate (submit)="send($event)">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="form-label" for="business-stakeholder">Who approved</label>
          <input
            id="business-stakeholder"
            class="form-input"
            [formField]="approvalForm.stakeholderName"
          />
        </div>
        <div>
          <label class="form-label" for="business-date">Date approved</label>
          <input
            id="business-date"
            class="form-input"
            type="date"
            [formField]="approvalForm.decidedOn"
          />
        </div>
        <div class="col-span-2">
          <label class="form-label" for="business-note">Note (optional)</label>
          <textarea
            id="business-note"
            class="form-input"
            rows="2"
            [formField]="approvalForm.note"
          ></textarea>
        </div>
        <div class="col-span-2">
          <label class="form-label" for="business-link">Link to the evidence (optional)</label>
          <input
            id="business-link"
            class="form-input"
            type="url"
            placeholder="https://"
            [formField]="approvalForm.link"
          />
        </div>
      </div>
      @for (field of fields; track $index) {
        @if (field().touched() && field().invalid()) {
          <p class="field-error">{{ field().errors()[0].message }}</p>
        }
      }
      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="closed.emit()">Back</button>
        <button type="submit" class="btn-primary" [disabled]="approvalForm().submitting()">
          Record approval
        </button>
      </div>
    </form>
  `,
})
export class BusinessApprovalForm {
  /** Records the approval; the form stays open if it throws. */
  readonly action = input.required<(approval: BusinessApproval) => Promise<void>>();
  readonly closed = output<void>();

  protected readonly model = signal({
    stakeholderName: '',
    decidedOn: today(),
    note: '',
    link: '',
  });

  protected readonly approvalForm = form(this.model, (f) => {
    required(f.stakeholderName, { message: 'Say who approved.' });
    maxLength(f.stakeholderName, 200, { message: 'Keep the name under 200 characters.' });
    required(f.decidedOn, { message: 'Choose the date they approved.' });
    maxLength(f.note, 2000, { message: 'Keep the note under 2000 characters.' });
    pattern(f.link, /^(https?:\/\/\S+)?$/i, {
      message: 'Enter a link starting with http:// or https://.',
    });
  });

  protected readonly fields = [
    this.approvalForm.stakeholderName,
    this.approvalForm.decidedOn,
    this.approvalForm.note,
    this.approvalForm.link,
  ];

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.approvalForm, async () => {
      const { stakeholderName, decidedOn, note, link } = this.model();
      await this.action()({
        stakeholderName: stakeholderName.trim(),
        decidedOn,
        note: note.trim() || null,
        link: link.trim() || null,
      });
      return undefined;
    });
  }
}
