import { Component, input, output, signal } from '@angular/core';
import { FormField, form, maxLength, pattern, required, submit } from '@angular/forms/signals';

/** The artwork a designer submits for approval: a link to the file, with an optional note. */
export interface ArtworkSubmission {
  url: string;
  note: string | null;
}

@Component({
  selector: 'app-artwork-form',
  imports: [FormField],
  template: `
    <form class="rounded-control bg-surface-muted p-4" novalidate (submit)="send($event)">
      <label class="form-label" for="artwork-url">Link to the artwork</label>
      <input
        id="artwork-url"
        class="form-input"
        type="url"
        placeholder="https://"
        [formField]="artworkForm.url"
      />
      @if (artworkForm.url().touched() && artworkForm.url().invalid()) {
        <p class="field-error">{{ artworkForm.url().errors()[0].message }}</p>
      }
      <label class="form-label mt-4" for="artwork-note">Note (optional)</label>
      <textarea
        id="artwork-note"
        class="form-input"
        rows="2"
        [formField]="artworkForm.note"
      ></textarea>
      @if (artworkForm.note().touched() && artworkForm.note().invalid()) {
        <p class="field-error">{{ artworkForm.note().errors()[0].message }}</p>
      }
      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="closed.emit()">Back</button>
        <button type="submit" class="btn-primary" [disabled]="artworkForm().submitting()">
          Submit for approval
        </button>
      </div>
    </form>
  `,
})
export class ArtworkForm {
  /** Submits the artwork; the form stays open if it throws. */
  readonly action = input.required<(artwork: ArtworkSubmission) => Promise<void>>();
  readonly closed = output<void>();

  protected readonly model = signal({ url: '', note: '' });

  protected readonly artworkForm = form(this.model, (f) => {
    required(f.url, { message: 'Paste the link to the artwork.' });
    pattern(f.url, /^https?:\/\/\S+$/i, {
      message: 'Enter a link starting with http:// or https://.',
    });
    maxLength(f.note, 1000, { message: 'Keep the note under 1000 characters.' });
  });

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.artworkForm, async () => {
      const { url, note } = this.model();
      await this.action()({ url: url.trim(), note: note.trim() || null });
      return undefined;
    });
  }
}
