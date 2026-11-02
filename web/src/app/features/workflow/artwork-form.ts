import { Component, input, output, signal } from '@angular/core';
import { FormField, applyWhen, form, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { FilePicker } from '../../shared/file-picker';
import { segmentClass } from '../../shared/segment';

/** The artwork a designer submits for approval: a link to it or an uploaded file, with an optional note. */
export interface ArtworkSubmission {
  url: string | null;
  file: File | null;
  note: string | null;
}

type Mode = 'link' | 'file';

@Component({
  selector: 'app-artwork-form',
  imports: [FilePicker, FormField],
  template: `
    <form class="rounded-control bg-surface-muted p-4" novalidate (submit)="send($event)">
      <div class="flex rounded-full border border-line bg-surface p-1" role="tablist" aria-label="How to submit">
        <button type="button" role="tab" [class]="tabClass('link')" [attr.aria-selected]="mode() === 'link'" (click)="mode.set('link')">
          Link
        </button>
        <button type="button" role="tab" [class]="tabClass('file')" [attr.aria-selected]="mode() === 'file'" (click)="mode.set('file')">
          File
        </button>
      </div>
      @if (mode() === 'link') {
        <label class="form-label mt-4" for="artwork-url">Link to the artwork</label>
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
      } @else {
        <p class="form-label mt-4">Artwork file</p>
        <app-file-picker label="Choose a file" [multiple]="false" [(files)]="files" />
        @if (fileMissing()) {
          <p class="field-error">Choose the artwork file.</p>
        }
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

  protected readonly mode = signal<Mode>('link');
  protected readonly files = signal<File[]>([]);
  protected readonly fileMissing = signal(false);

  protected readonly model = signal({ url: '', note: '' });

  protected readonly artworkForm = form(this.model, (f) => {
    applyWhen(
      f.url,
      () => this.mode() === 'link',
      (url) => {
        required(url, { message: 'Paste the link to the artwork.' });
        pattern(url, /^https?:\/\/\S+$/i, {
          message: 'Enter a link starting with http:// or https://.',
        });
      },
    );
    maxLength(f.note, 1000, { message: 'Keep the note under 1000 characters.' });
  });

  protected tabClass(mode: Mode): string {
    return segmentClass(this.mode() === mode);
  }

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    this.fileMissing.set(this.mode() === 'file' && this.files().length === 0);
    if (this.fileMissing()) return;
    await submit(this.artworkForm, async () => {
      const { url, note } = this.model();
      const file = this.mode() === 'file' ? this.files()[0] : null;
      await this.action()({ url: file ? null : url.trim(), file, note: note.trim() || null });
      return undefined;
    });
  }
}
