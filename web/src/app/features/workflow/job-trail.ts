import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { JobEvent } from '../../core/models';

/** What each logged action reads as in the activity list: "<user> <text>". */
const ACTION_TEXT: Record<JobEvent['action'], string> = {
  Submit: 'sent the brief',
  RequestInformation: 'asked for information',
  Answer: 'answered',
  MarkReady: 'marked the brief complete',
  Cancel: 'cancelled the job',
  AllocateAndSchedule: 'allocated and scheduled the job',
  Start: 'started work',
  SubmitForApproval: 'submitted artwork for approval',
  ApproveDesign: 'approved the design',
  SendBack: 'sent the design back',
  ApproveMarketing: 'approved the artwork',
  NeedsBusinessApproval: 'asked for business approval',
  RecordBusinessApproval: 'recorded business approval',
  RequestChanges: 'requested changes',
  Close: 'closed the job',
  Reassign: 'reassigned the job',
  Reschedule: 'rescheduled the job',
};

/** Everything done to a job, oldest first (D72): who did it, when, the status it left, and what they wrote. */
@Component({
  selector: 'app-job-trail',
  imports: [DatePipe],
  template: `
    <section class="panel p-6" aria-labelledby="job-activity">
      <h2 id="job-activity" class="font-display text-lg font-semibold">Activity</h2>
      <ol class="mt-4 space-y-4 text-sm">
        @for (event of history(); track $index) {
          <li>
            <p>
              <span class="font-semibold">{{ event.userName }}</span> {{ text[event.action] }}
              <span class="text-ink-muted">&middot; {{ event.toStatusName }}</span>
            </p>
            @if (event.message) {
              <p class="mt-1 whitespace-pre-line">{{ event.message }}</p>
            }
            <p class="mt-1 text-xs text-ink-muted">{{ event.at | date: 'EEE d MMM y, HH:mm' }}</p>
          </li>
        }
      </ol>
    </section>
  `,
})
export class JobTrail {
  readonly history = input.required<JobEvent[]>();

  protected readonly text = ACTION_TEXT;
}
