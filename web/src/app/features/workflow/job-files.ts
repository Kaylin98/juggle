import { DatePipe } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { JobsService } from '../../core/jobs.service';
import { FileKind, JobFile } from '../../core/models';
import { FilePicker, formatSize } from '../../shared/file-picker';
import { ToastService } from '../../shared/toast.service';

const KIND_LABELS: Record<FileKind, string> = {
  Brief: 'Brief document',
  Supporting: 'Supporting material',
  Artwork: 'Artwork',
};

/**
 * The brief document and supporting material attached to a job, each a download. The user who briefed the job can
 * attach more.
 */
@Component({
  selector: 'app-job-files',
  imports: [DatePipe, FilePicker],
  template: `
    <section class="panel p-6" aria-labelledby="job-files">
      <h2 id="job-files" class="font-display text-lg font-semibold">Files</h2>
      <ul class="mt-4 space-y-3 text-sm">
        @for (file of files(); track file.id) {
          <li>
            <a
              class="font-semibold text-accent-700 hover:underline"
              [href]="jobs.fileUrl(jobId(), file.id)"
              [attr.download]="file.fileName"
              >{{ file.fileName }}</a
            >
            <p class="mt-1 text-xs text-ink-muted">
              {{ kindLabels[file.kind] }} &middot; {{ size(file) }} &middot; {{ file.uploadedByName }},
              {{ file.uploadedAt | date: 'EEE d MMM y' }}
            </p>
          </li>
        } @empty {
          <li class="text-ink-muted">No files attached.</li>
        }
      </ul>
      @if (canAttach()) {
        <div class="mt-6 grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
          <div>
            <p class="form-label">Brief document</p>
            <app-file-picker label="Choose files" [(files)]="briefFiles" />
          </div>
          <div>
            <p class="form-label">Supporting files</p>
            <app-file-picker label="Choose files" [(files)]="supportingFiles" />
          </div>
        </div>
        @if (briefFiles().length + supportingFiles().length > 0) {
          <div class="mt-4 flex justify-end">
            <button type="button" class="btn-primary" [disabled]="uploading()" (click)="upload()">
              Attach
            </button>
          </div>
        }
      }
    </section>
  `,
})
export class JobFiles {
  protected readonly jobs = inject(JobsService);
  private readonly toast = inject(ToastService);

  readonly jobId = input.required<string>();
  readonly files = input.required<JobFile[]>();
  readonly canAttach = input(false);
  /** Files were attached, so the page showing the job should reload. */
  readonly attached = output<void>();

  protected readonly kindLabels = KIND_LABELS;
  protected readonly briefFiles = signal<File[]>([]);
  protected readonly supportingFiles = signal<File[]>([]);
  protected readonly uploading = signal(false);

  protected size(file: JobFile): string {
    return formatSize(file.sizeBytes);
  }

  protected async upload(): Promise<void> {
    this.uploading.set(true);
    try {
      // Each file leaves its list once attached, so trying again after a failure attaches only the rest.
      while (this.briefFiles().length > 0) {
        await this.jobs.attach(this.jobId(), 'Brief', this.briefFiles()[0]);
        this.briefFiles.update((files) => files.slice(1));
      }
      while (this.supportingFiles().length > 0) {
        await this.jobs.attach(this.jobId(), 'Supporting', this.supportingFiles()[0]);
        this.supportingFiles.update((files) => files.slice(1));
      }
      this.toast.show('Files attached.', 'success');
      this.attached.emit();
    } catch (error) {
      this.toast.error(error);
    } finally {
      this.uploading.set(false);
    }
  }
}
