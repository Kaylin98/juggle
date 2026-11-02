import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { JobsService } from '../../core/jobs.service';
import { Artwork } from '../../core/models';

/** The artwork versions submitted for a job, newest first, each a link or a file. */
@Component({
  selector: 'app-job-artwork',
  imports: [DatePipe],
  template: `
    <section class="panel p-6" aria-labelledby="job-artwork">
      <h2 id="job-artwork" class="font-display text-lg font-semibold">Artwork</h2>
      <ul class="mt-4 space-y-4 text-sm">
        @for (version of newestFirst(); track version.version) {
          <li>
            @if (version.file; as file) {
              <a
                class="font-semibold text-accent-700 hover:underline"
                [href]="jobs.fileUrl(jobId(), file.id)"
                [attr.download]="file.fileName"
              >
                Version {{ version.version }}: {{ file.fileName }}
              </a>
            } @else {
              <a
                class="font-semibold text-accent-700 hover:underline"
                [href]="version.url"
                target="_blank"
                rel="noopener"
              >
                Version {{ version.version }}
              </a>
            }
            <p class="mt-1 text-xs text-ink-muted">
              {{ version.submittedByName }} &middot;
              {{ version.submittedAt | date: 'EEE d MMM y, HH:mm' }}
            </p>
            @if (version.note) {
              <p class="mt-1 whitespace-pre-line">{{ version.note }}</p>
            }
          </li>
        }
      </ul>
    </section>
  `,
})
export class JobArtwork {
  protected readonly jobs = inject(JobsService);

  readonly jobId = input.required<string>();
  readonly artwork = input.required<Artwork[]>();

  protected newestFirst(): Artwork[] {
    return [...this.artwork()].reverse();
  }
}
