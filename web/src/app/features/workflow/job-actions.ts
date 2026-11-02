import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { Job, Person, WorkflowAction } from '../../core/models';
import { ToastService } from '../../shared/toast.service';
import { AllocateForm } from './allocate-form';
import { MessageForm } from './message-form';

/** The actions this panel offers, in the order of the buttons. */
const ACTIONS: WorkflowAction[] = [
  'AllocateAndSchedule',
  'MarkReady',
  'RequestInformation',
  'Cancel',
];

/**
 * The workflow actions the signed-in user may take on a job now (D70): the API lists them on the job, so the panel
 * shows a button for each and never decides by role. Actions that need more than a click open their form in place.
 */
@Component({
  selector: 'app-job-actions',
  imports: [AllocateForm, MessageForm],
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
  private readonly toast = inject(ToastService);

  readonly job = input.required<Job>();
  /** The team's people, for Allocate and schedule. */
  readonly people = input<Person[]>([]);
  /** An action changed the job, so the page showing it should reload. */
  readonly changed = output<void>();

  protected readonly available = computed(() =>
    ACTIONS.filter((a) => this.job().actions.includes(a)),
  );

  protected readonly labels = computed<Partial<Record<WorkflowAction, string>>>(() => ({
    AllocateAndSchedule: 'Allocate and schedule',
    MarkReady: `${this.auth.terms().brief} complete`,
    RequestInformation: 'Request information',
    Cancel: `Cancel ${this.auth.terms().job.toLowerCase()}`,
  }));

  /** The form that is open. Closes when the job moves on or another opens. */
  protected readonly open = linkedSignal<string, WorkflowAction | null>({
    source: () => `${this.job().id}/${this.job().statusId}`,
    computation: () => null,
  });

  protected async choose(action: WorkflowAction): Promise<void> {
    if (action !== 'MarkReady') {
      this.open.set(action);
      return;
    }
    try {
      await this.jobs.markReady(this.job().id);
      this.toast.show(`${this.auth.terms().brief} marked complete.`, 'success');
      this.changed.emit();
    } catch (error) {
      this.toast.error(error);
    }
  }

  protected readonly requestInformation = async (message: string): Promise<void> => {
    await this.run(() => this.jobs.requestInformation(this.job().id, message), 'Question sent.');
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
