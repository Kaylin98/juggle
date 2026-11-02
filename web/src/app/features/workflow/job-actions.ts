import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { BusinessApproval, Job, Person, RequestChanges, WorkflowAction } from '../../core/models';
import { ToastService } from '../../shared/toast.service';
import { Tooltip } from '../../shared/tooltip';
import { ONE_CLICK_ACTIONS, actionHints, actionLabels } from './action-labels';
import { ActionRunner } from './action-runner';
import { AllocateForm } from './allocate-form';
import { ArtworkForm, ArtworkSubmission } from './artwork-form';
import { BusinessApprovalForm } from './business-approval-form';
import { MessageForm } from './message-form';
import { RequestChangesForm } from './request-changes-form';

/** The actions this panel offers, in the order of the buttons; Cancel comes last. */
const ACTIONS: WorkflowAction[] = [
  'Answer',
  'AllocateAndSchedule',
  'MarkReady',
  'RequestInformation',
  'Start',
  'SubmitForApproval',
  'ApproveDesign',
  'ApproveMarketing',
  'NeedsBusinessApproval',
  'RecordBusinessApproval',
  'RequestChanges',
  'SendBack',
  'Close',
  'Cancel',
];

/**
 * The workflow actions the signed-in user may take on a job now (D70): the API lists them on the job, so the panel
 * shows a button for each and never decides by role. Actions that need more than a click open their form in place.
 */
@Component({
  selector: 'app-job-actions',
  imports: [AllocateForm, ArtworkForm, BusinessApprovalForm, MessageForm, RequestChangesForm, Tooltip],
  template: `
    @if (available().length > 0) {
      @switch (open()) {
        @case ('AllocateAndSchedule') {
          <app-allocate-form
            [job]="job()"
            [people]="people()"
            (done)="finished()"
            (closed)="open.set(null)"
          />
        }
        @case ('RequestInformation') {
          <app-message-form
            id="request-information"
            label="What do you need to know?"
            submitLabel="Send"
            [action]="requestInformation"
            (closed)="open.set(null)"
          />
        }
        @case ('Answer') {
          <app-message-form
            id="answer"
            label="Your answer"
            submitLabel="Send answer"
            [action]="answer"
            (closed)="open.set(null)"
          />
        }
        @case ('SubmitForApproval') {
          <app-artwork-form [action]="submitArtwork" (closed)="open.set(null)" />
        }
        @case ('ApproveDesign') {
          <app-message-form
            id="approve-design"
            label="Comment (optional)"
            submitLabel="Approve design"
            [mandatory]="false"
            [action]="approveDesign"
            (closed)="open.set(null)"
          />
        }
        @case ('SendBack') {
          <app-message-form
            id="send-back"
            label="What needs to change?"
            submitLabel="Send back"
            [action]="sendBack"
            (closed)="open.set(null)"
          />
        }
        @case ('ApproveMarketing') {
          <app-message-form
            id="approve-marketing"
            label="Comment (optional)"
            submitLabel="Approve artwork"
            [mandatory]="false"
            [action]="approveMarketing"
            (closed)="open.set(null)"
          />
        }
        @case ('NeedsBusinessApproval') {
          <app-message-form
            id="needs-business-approval"
            label="Who needs to approve it?"
            submitLabel="Send for business approval"
            [action]="needsBusinessApproval"
            (closed)="open.set(null)"
          />
        }
        @case ('RecordBusinessApproval') {
          <app-business-approval-form [action]="recordBusinessApproval" (closed)="open.set(null)" />
        }
        @case ('RequestChanges') {
          <app-request-changes-form
            [business]="job().actions.includes('RecordBusinessApproval')"
            [action]="requestChanges"
            (closed)="open.set(null)"
          />
        }
        @case ('Cancel') {
          <app-message-form
            id="cancel-reason"
            label="Why is it being cancelled?"
            submitLabel="Cancel job"
            [action]="cancel"
            (closed)="open.set(null)"
          />
        }
        @default {
          <div class="flex flex-wrap items-center gap-2">
            @for (action of available(); track action) {
              <button
                type="button"
                [class]="action === 'Cancel' ? 'btn-quiet' : 'btn-secondary'"
                [appTooltip]="hints()[action] ?? ''"
                (click)="choose(action)"
              >
                {{ labels()[action] }}
              </button>
            }
          </div>
        }
      }
    }
  `,
})
export class JobActions {
  private readonly auth = inject(AuthService);
  private readonly jobs = inject(JobsService);
  private readonly runner = inject(ActionRunner);
  private readonly toast = inject(ToastService);

  readonly job = input.required<Job>();
  /** The team's people, for Allocate and schedule. */
  readonly people = input<Person[]>([]);
  /** The form to open at once, such as the one a card dropped on a column calls for. */
  readonly startWith = input<WorkflowAction | null>(null);
  /** An action changed the job, so the page showing it should reload. */
  readonly changed = output<void>();

  protected readonly available = computed(() =>
    ACTIONS.filter((a) => this.job().actions.includes(a)),
  );

  protected readonly labels = computed(() => actionLabels(this.auth.terms()));

  protected readonly hints = computed(() => actionHints(this.auth.terms()));

  /** The form that is open. Closes when the job moves on or another opens. */
  protected readonly open = linkedSignal<
    { key: string; start: WorkflowAction | null },
    WorkflowAction | null
  >({
    source: () => ({ key: `${this.job().id}/${this.job().statusId}`, start: this.startWith() }),
    computation: ({ start }) => start,
  });

  /** Actions that need no more than a click run at once; the rest open their form. */
  protected async choose(action: WorkflowAction): Promise<void> {
    if (!ONE_CLICK_ACTIONS.includes(action)) {
      this.open.set(action);
    } else if (await this.runner.runOneClick(this.job().id, action)) {
      this.changed.emit();
    }
  }

  protected readonly requestInformation = async (message: string): Promise<void> => {
    await this.run(() => this.jobs.requestInformation(this.job().id, message), 'Question sent.');
  };

  protected readonly submitArtwork = async (artwork: ArtworkSubmission): Promise<void> => {
    await this.run(
      () =>
        artwork.file
          ? this.jobs.submitArtworkFile(this.job().id, artwork.file, artwork.note)
          : this.jobs.submitArtwork(this.job().id, artwork.url!, artwork.note),
      'Artwork submitted for approval.',
    );
  };

  protected readonly approveDesign = async (comment: string): Promise<void> => {
    await this.run(
      () => this.jobs.approveDesign(this.job().id, comment || null),
      'Design approved.',
    );
  };

  protected readonly sendBack = async (comment: string): Promise<void> => {
    await this.run(() => this.jobs.sendBack(this.job().id, comment), 'Sent back to the designer.');
  };

  protected readonly approveMarketing = async (comment: string): Promise<void> => {
    await this.run(
      () => this.jobs.approveMarketing(this.job().id, comment || null),
      'Artwork approved.',
    );
  };

  protected readonly needsBusinessApproval = async (message: string): Promise<void> => {
    await this.run(
      () => this.jobs.needsBusinessApproval(this.job().id, message),
      'Sent for business approval.',
    );
  };

  protected readonly recordBusinessApproval = async (approval: BusinessApproval): Promise<void> => {
    await this.run(
      () => this.jobs.recordBusinessApproval(this.job().id, approval),
      'Business approval recorded.',
    );
  };

  protected readonly requestChanges = async (changes: RequestChanges): Promise<void> => {
    await this.run(
      () => this.jobs.requestChanges(this.job().id, changes),
      'Changes requested. The traffic manager will schedule them.',
    );
  };

  protected readonly answer = async (message: string): Promise<void> => {
    await this.run(() => this.jobs.answer(this.job().id, message), 'Answer sent.');
  };

  protected readonly cancel = async (reason: string): Promise<void> => {
    await this.run(
      () => this.jobs.cancel(this.job().id, reason),
      `${this.auth.terms().job} cancelled.`,
    );
  };

  protected finished(): void {
    this.changed.emit();
  }

  private async run(request: () => Promise<unknown>, success: string): Promise<void> {
    try {
      await request();
      this.toast.show(success, 'success');
      this.changed.emit();
    } catch (error) {
      this.toast.error(error);
    }
  }
}
