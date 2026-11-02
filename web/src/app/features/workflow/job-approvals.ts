import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Approval, ApprovalStage } from '../../core/models';

const STAGE_LABELS: Record<ApprovalStage, string> = {
  Design: 'Design approval',
  Marketing: 'Marketing approval',
  Business: 'Business approval',
};

/** The approval decisions on a job's artwork, oldest first: who decided, on which version, and what they wrote (D72). */
@Component({
  selector: 'app-job-approvals',
  imports: [DatePipe],
  template: `
    <section class="panel p-6" aria-labelledby="job-approvals">
      <h2 id="job-approvals" class="font-display text-lg font-semibold">Approvals</h2>
      <ul class="mt-4 space-y-4 text-sm">
        @for (approval of approvals(); track $index) {
          <li>
            <p>
              <span class="font-semibold">{{ stageLabels[approval.stage] }}</span>
              <span [class]="approval.decision === 'Approved' ? 'text-ok-700' : 'text-warn-700'">
                &middot; {{ approval.decision === 'Approved' ? 'Approved' : 'Changes requested' }}
              </span>
              @if (approval.version) {
                <span class="text-ink-muted">&middot; version {{ approval.version }}</span>
              }
            </p>
            <p class="mt-1 text-xs text-ink-muted">
              {{ approval.stakeholderName ?? approval.reviewerName }}
              @if (approval.stakeholderName) {
                (recorded by {{ approval.reviewerName }})
              }
              &middot;
              {{
                approval.decidedOn
                  ? (approval.decidedOn | date: 'EEE d MMM y')
                  : (approval.recordedAt | date: 'EEE d MMM y, HH:mm')
              }}
            </p>
            @if (approval.comment) {
              <p class="mt-1 whitespace-pre-line">{{ approval.comment }}</p>
            }
            @if (approval.link) {
              <a
                class="mt-1 inline-block font-semibold text-accent-700 hover:underline"
                [href]="approval.link"
                target="_blank"
                rel="noopener"
              >
                Evidence
              </a>
            }
          </li>
        }
      </ul>
    </section>
  `,
})
export class JobApprovals {
  readonly approvals = input.required<Approval[]>();

  protected readonly stageLabels = STAGE_LABELS;
}
