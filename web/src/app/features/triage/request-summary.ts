import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { WorkRequest } from '../../core/models';

/** A request at a glance, above the accept and reject forms. */
@Component({
  selector: 'app-request-summary',
  imports: [DatePipe],
  template: `
    <div class="rounded-control bg-surface-muted p-4">
      <p class="label-caps">{{ request().department }} &middot; {{ request().priority }} priority</p>
      <p class="mt-2 font-display font-semibold">{{ request().title }}</p>
      <p class="mt-1 text-sm text-ink-muted">
        From {{ request().requesterName }}
        @if (request().requestedDueDate; as due) {
          &middot; studio deadline {{ due | date: 'EEE d MMM' }}
        }
      </p>
    </div>
  `,
})
export class RequestSummary {
  readonly request = input.required<WorkRequest>();
}
