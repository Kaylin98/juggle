import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Revision } from '../../core/models';

/** The rounds of changes asked for after the artwork was first submitted, oldest first (D72). */
@Component({
  selector: 'app-job-revisions',
  imports: [DatePipe],
  template: `
    <section class="panel p-6" aria-labelledby="job-revisions">
      <h2 id="job-revisions" class="font-display text-lg font-semibold">Revisions</h2>
      <ul class="mt-4 space-y-4 text-sm">
        @for (revision of revisions(); track revision.number) {
          <li>
            <p>
              <span class="font-semibold">Revision {{ revision.number }}</span>
              <span class="text-ink-muted">
                &middot; asked for by
                {{ revision.source === 'Business' ? 'a stakeholder, recorded by' : '' }}
                {{ revision.requestedByName }} &middot;
                {{ revision.requestedAt | date: 'EEE d MMM y' }}
              </span>
            </p>
            <p class="mt-1 whitespace-pre-line">{{ revision.reason }}</p>
            @if (revision.changes) {
              <p class="mt-1 whitespace-pre-line text-ink-muted">{{ revision.changes }}</p>
            }
            <p class="mt-1 text-xs text-ink-muted">
              {{
                revision.designerName
                  ? revision.designerName + ', ' + revision.estimateHours + 'h'
                  : 'Waiting to be scheduled'
              }}
              @if (revision.revisedRequiredDate) {
                &middot; new required date {{ revision.revisedRequiredDate | date: 'EEE d MMM' }}
              }
              &middot; {{ revision.completedAt ? 'design approved' : 'open' }}
            </p>
            @if (revision.link) {
              <a
                class="mt-1 inline-block font-semibold text-accent-700 hover:underline"
                [href]="revision.link"
                target="_blank"
                rel="noopener"
              >
                Link
              </a>
            }
          </li>
        }
      </ul>
    </section>
  `,
})
export class JobRevisions {
  readonly revisions = input.required<Revision[]>();
}
