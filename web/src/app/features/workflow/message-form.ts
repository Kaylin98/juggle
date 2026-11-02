import { Component, input, output, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';

/** Asks for a message for a workflow action, such as the question to the marketing manager or the reason for cancelling. */
@Component({
  selector: 'app-message-form',
  imports: [FormField],
  template: `
    <form class="rounded-control bg-surface-muted p-4" novalidate (submit)="send($event)">
      <label class="form-label" [for]="id()">{{ label() }}</label>
      <textarea
        [id]="id()"
        class="form-input"
        rows="3"
        [formField]="messageForm.message"
      ></textarea>
      @if (messageForm.message().touched() && messageForm.message().invalid()) {
        <p class="field-error">{{ messageForm.message().errors()[0].message }}</p>
      }
      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="closed.emit()">Back</button>
        <button type="submit" class="btn-primary" [disabled]="messageForm().submitting()">
          {{ submitLabel() }}
        </button>
      </div>
    </form>
  `,
})
export class MessageForm {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly submitLabel = input.required<string>();
  /** Does the action; the form stays open if it throws. */
  readonly action = input.required<(message: string) => Promise<void>>();
  readonly closed = output<void>();

  protected readonly model = signal({ message: '' });

  protected readonly messageForm = form(this.model, (f) => {
    required(f.message, { message: 'Write a message.' });
    maxLength(f.message, 2000, { message: 'Keep it under 2000 characters.' });
  });

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.messageForm, async () => {
      await this.action()(this.model().message.trim());
      return undefined;
    });
  }
}
