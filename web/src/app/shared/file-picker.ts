import { Component, input, model, signal } from '@angular/core';

/** The most a file may be, and the types the API accepts (common documents, images, PDFs and videos). */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.rtf',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp4', '.m4v', '.mov', '.webm',
];

/** "340 KB", "12.5 MB". */
export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Chooses files to upload: shows the ones chosen with a Remove for each, and refuses a file that is too big or of a
 * type the API does not take, before anything is sent.
 */
@Component({
  selector: 'app-file-picker',
  template: `
    <input
      #input
      type="file"
      class="hidden"
      tabindex="-1"
      [accept]="accept"
      [multiple]="multiple()"
      (change)="choose(input)"
    />
    <button type="button" class="btn-secondary" (click)="input.click()">{{ label() }}</button>
    @if (error()) {
      <p class="field-error">{{ error() }}</p>
    }
    @if (files().length > 0) {
      <ul class="mt-2 space-y-1 text-sm">
        @for (file of files(); track file) {
          <li class="flex items-center gap-2">
            <span class="truncate">{{ file.name }}</span>
            <span class="shrink-0 text-xs text-ink-muted">{{ size(file) }}</span>
            <button type="button" class="btn-quiet ml-auto" (click)="remove(file)">Remove</button>
          </li>
        }
      </ul>
    }
  `,
})
export class FilePicker {
  readonly label = input('Choose a file');
  readonly multiple = input(true);
  readonly files = model<File[]>([]);

  protected readonly accept = ACCEPTED_EXTENSIONS.join(',');
  protected readonly error = signal('');

  protected size(file: File): string {
    return formatSize(file.size);
  }

  protected choose(input: HTMLInputElement): void {
    const chosen = [...(input.files ?? [])];
    input.value = '';
    const refused = chosen.find((f) => f.size > MAX_FILE_BYTES || !this.accepted(f));
    this.error.set(
      refused
        ? refused.size > MAX_FILE_BYTES
          ? `${refused.name} is over 25 MB.`
          : `${refused.name} is not a document, image, PDF or video.`
        : '',
    );
    if (refused) return;
    this.files.update((files) => (this.multiple() ? [...files, ...chosen] : chosen));
  }

  protected remove(file: File): void {
    this.files.update((files) => files.filter((f) => f !== file));
  }

  private accepted(file: File): boolean {
    return ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
  }
}
