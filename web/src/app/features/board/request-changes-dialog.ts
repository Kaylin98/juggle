import { Component, inject, input, output, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { Task } from '../../core/models';
import { ToastService } from '../../shared/toast.service';
import { BoardService } from './board.service';
import { BoardCard } from './task-card';

/**
 * The brand's manager sends a card awaiting approval back with what to change: it moves to Feedback needed on the next
 * review round, and the designer sees the comment on the task (D58).
 */
@Component({
  selector: 'app-request-changes-dialog',
  imports: [FormField],
  template: `
    <form class="px-6 pb-6" novalidate (submit)="send($event)">
      <div class="flex items-center gap-2 text-sm text-ink-muted" [style.--hue]="card().project.colour">
        <span class="hue-dot size-2 rounded-full"></span>
        <span>{{ card().project.name }}</span>
      </div>
      <p class="mt-2 font-display text-base font-semibold">{{ card().task.title }}</p>

      <div class="mt-6">
        <label class="form-label" for="changes-comment">What needs to change?</label>
        <textarea id="changes-comment" class="form-input" rows="5" [formField]="changesForm.comment"></textarea>
        @if (changesForm.comment().touched() && changesForm.comment().invalid()) {
          <p class="field-error">{{ changesForm.comment().errors()[0].message }}</p>
        }
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="closed.emit()">Cancel</button>
        <button type="submit" class="btn-primary" [disabled]="changesForm().submitting()">Send back</button>
      </div>
    </form>
  `,
})
export class RequestChangesDialog {
  private readonly boardService = inject(BoardService);
  private readonly toast = inject(ToastService);

  readonly card = input.required<BoardCard>();
  readonly sent = output<Task>();
  readonly closed = output<void>();

  protected readonly model = signal({ comment: '' });

  protected readonly changesForm = form(this.model, (changes) => {
    required(changes.comment, { message: 'Say what needs to change.' });
    maxLength(changes.comment, 1000, { message: 'Keep the comment under 1000 characters.' });
  });

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.changesForm, async () => {
      try {
        this.sent.emit(await this.boardService.requestChanges(this.card().task.id, this.model().comment.trim()));
      } catch (error) {
        this.toast.error(error);
      }
      return undefined;
    });
  }
}
