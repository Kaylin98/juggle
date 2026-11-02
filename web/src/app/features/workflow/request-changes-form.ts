import { Component, computed, input, output, signal } from '@angular/core';
import { FormField, form, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { RequestChanges } from '../../core/models';
import { today } from '../../shared/dates';

/**
 * Asks for changes to the artwork. When the changes come from a stakeholder's decision, the marketing manager says who
 * decided and when. The job keeps its ID and goes back to the traffic manager to schedule.
 */
@Component({
  selector: 'app-request-changes-form',
  imports: [FormField],
  template: `
    <form class="rounded-control bg-surface-muted p-4" novalidate (submit)="send($event)">
      <div class="grid grid-cols-2 gap-4">
        @if (business()) {
          <div>
            <label class="form-label" for="changes-stakeholder">Who asked for the changes</label>
            <input
              id="changes-stakeholder"
              class="form-input"
              [formField]="changesForm.stakeholderName"
            />
          </div>
          <div>
            <label class="form-label" for="changes-decided">Date they decided</label>
            <input
              id="changes-decided"
              class="form-input"
              type="date"
              [formField]="changesForm.decidedOn"
            />
          </div>
        }
        <div class="col-span-2">
          <label class="form-label" for="changes-reason">Reason</label>
          <textarea
            id="changes-reason"
            class="form-input"
            rows="2"
            [formField]="changesForm.reason"
          ></textarea>
        </div>
        <div class="col-span-2">
          <label class="form-label" for="changes-what">What should change (optional)</label>
          <textarea
            id="changes-what"
            class="form-input"
            rows="2"
            [formField]="changesForm.changes"
          ></textarea>
        </div>
        <div>
          <label class="form-label" for="changes-required">New required date (optional)</label>
          <input
            id="changes-required"
            class="form-input"
            type="date"
            [formField]="changesForm.revisedRequiredDate"
          />
        </div>
        <div>
          <label class="form-label" for="changes-link">Link (optional)</label>
          <input
            id="changes-link"
            class="form-input"
            type="url"
            placeholder="https://"
            [formField]="changesForm.link"
          />
        </div>
      </div>
      @for (field of fields(); track $index) {
        @if (field().touched() && field().invalid()) {
          <p class="field-error">{{ field().errors()[0].message }}</p>
        }
      }
      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="closed.emit()">Back</button>
        <button type="submit" class="btn-primary" [disabled]="changesForm().submitting()">
          Request changes
        </button>
      </div>
    </form>
  `,
})
export class RequestChangesForm {
  /** The changes come from a stakeholder, so who and when are needed. */
  readonly business = input(false);
  /** Asks for the changes; the form stays open if it throws. */
  readonly action = input.required<(changes: RequestChanges) => Promise<void>>();
  readonly closed = output<void>();

  protected readonly model = signal({
    reason: '',
    changes: '',
    revisedRequiredDate: '',
    link: '',
    stakeholderName: '',
    decidedOn: today(),
  });

  protected readonly changesForm = form(this.model, (f) => {
    required(f.reason, { message: 'Give the reason for the changes.' });
    maxLength(f.reason, 2000, { message: 'Keep the reason under 2000 characters.' });
    maxLength(f.changes, 2000, { message: 'Keep it under 2000 characters.' });
    pattern(f.link, /^(https?:\/\/\S+)?$/i, {
      message: 'Enter a link starting with http:// or https://.',
    });
    required(f.stakeholderName, {
      message: 'Say who asked for the changes.',
      when: () => this.business(),
    });
  });

  protected readonly fields = computed(() => [
    ...(this.business() ? [this.changesForm.stakeholderName] : []),
    this.changesForm.reason,
    this.changesForm.changes,
    this.changesForm.link,
  ]);

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.changesForm, async () => {
      const { reason, changes, revisedRequiredDate, link, stakeholderName, decidedOn } =
        this.model();
      await this.action()({
        reason: reason.trim(),
        changes: changes.trim() || null,
        revisedRequiredDate: revisedRequiredDate || null,
        link: link.trim() || null,
        stakeholderName: this.business() ? stakeholderName.trim() : null,
        decidedOn: this.business() ? decidedOn : null,
      });
      return undefined;
    });
  }
}
