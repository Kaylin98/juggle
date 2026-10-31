import { Component, computed, inject, input, linkedSignal, output, resource } from '@angular/core';
import { FormField, form, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { WorkRequest } from '../../core/models';
import { RequestsService } from '../../core/requests.service';
import { segmentClass } from '../../shared/segment';
import { Select, SelectOption } from '../../shared/select';
import { ToastService } from '../../shared/toast.service';
import { Tooltip } from '../../shared/tooltip';
import { RequestSummary } from './request-summary';

type Mode = 'newBrief' | 'existing';

interface AcceptForm {
  projectName: string;
  projectId: string;
  assigneePersonId: string;
  estimateHours: number | null;
  dueDate: string;
}

/**
 * Accepts a request into the first column after Triage (D18), with assignee, estimate and committed date. As a new
 * brief (the default) it creates a project named with the next job code, editable here, and one task per
 * deliverable; into an existing project it makes one task (D51).
 */
@Component({
  selector: 'app-accept-dialog',
  imports: [FormField, RequestSummary, Select, Tooltip],
  template: `
    <form class="px-6 pb-6" novalidate (submit)="accept($event)">
      <app-request-summary [request]="request()" />

      @if (newBrief.isLoading()) {
        <p class="mt-6 text-sm text-ink-muted">Loading...</p>
      } @else {
        <div class="mt-6 flex rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Accept as">
          <span class="flex flex-1" [appTooltip]="canStartBrief() ? '' : noPrefixHint()">
            <button
              type="button"
              role="tab"
              [class]="tabClass('newBrief')"
              [attr.aria-selected]="mode() === 'newBrief'"
              [disabled]="!canStartBrief()"
              (click)="mode.set('newBrief')"
            >
              New brief
            </button>
          </span>
          <button
            type="button"
            role="tab"
            [class]="tabClass('existing')"
            [attr.aria-selected]="mode() === 'existing'"
            (click)="mode.set('existing')"
          >
            Existing project
          </button>
        </div>

        <div class="mt-6 space-y-4">
          @if (mode() === 'newBrief') {
            <div>
              <label class="form-label" for="accept-name">Job code</label>
              <input id="accept-name" class="form-input" [formField]="acceptForm.projectName" />
              @if (acceptForm.projectName().touched() && acceptForm.projectName().invalid()) {
                <p class="field-error">{{ acceptForm.projectName().errors()[0].message }}</p>
              }
              <p class="mt-2 flex items-center gap-2 text-sm text-ink-muted">
                <span class="size-2.5 shrink-0 rounded-full" [style.background-color]="newBrief.value()?.colour"></span>
                A new project, with {{ taskCount() }} {{ taskCount() === 1 ? 'task' : 'tasks, one per deliverable' }}
              </p>
            </div>
          } @else {
            <div>
              <label class="form-label" for="accept-project">Project</label>
              <app-select triggerId="accept-project" [options]="projectOptions()" [formField]="acceptForm.projectId" />
              @if (acceptForm.projectId().touched() && acceptForm.projectId().invalid()) {
                <p class="field-error">{{ acceptForm.projectId().errors()[0].message }}</p>
              }
            </div>
          }
          <div>
            <label class="form-label" for="accept-assignee">Assignee</label>
            <app-select triggerId="accept-assignee" [options]="peopleOptions()" [formField]="acceptForm.assigneePersonId" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label" for="accept-estimate">Estimate (hours)</label>
              <input id="accept-estimate" class="form-input" type="number" step="0.5" [formField]="acceptForm.estimateHours" />
            </div>
            <div>
              <label class="form-label" for="accept-due">Committed due date</label>
              <input id="accept-due" class="form-input" type="date" [formField]="acceptForm.dueDate" />
            </div>
          </div>
          @if (acceptForm.estimateHours().touched() && acceptForm.estimateHours().invalid()) {
            <p class="field-error">{{ acceptForm.estimateHours().errors()[0].message }}</p>
          } @else if (mode() === 'newBrief' && taskCount() > 1) {
            <p class="text-sm text-ink-muted">The estimate goes on the first task.</p>
          }
        </div>
      }

      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="closed.emit()">Cancel</button>
        <button type="submit" class="btn-primary" [disabled]="newBrief.isLoading() || acceptForm().submitting()">Accept</button>
      </div>
    </form>
  `,
})
export class AcceptDialog {
  private readonly requests = inject(RequestsService);
  private readonly toast = inject(ToastService);

  readonly request = input.required<WorkRequest>();
  readonly done = output<void>();
  readonly closed = output<void>();

  protected readonly options = resource({
    params: () => this.request().teamId,
    loader: ({ params }) => this.requests.acceptOptions(params),
  });

  protected readonly newBrief = resource({
    params: () => this.request().id,
    loader: ({ params }) => this.requests.newBrief(params),
  });

  /** A new brief needs a job code, so the request's department needs a prefix. */
  protected readonly canStartBrief = computed(() => !!this.newBrief.value()?.projectName);
  protected readonly noPrefixHint = computed(
    () => `${this.request().department} has no job code prefix, so it can't start a new brief`,
  );

  protected readonly mode = linkedSignal<Mode>(() => (this.canStartBrief() ? 'newBrief' : 'existing'));

  /** One task per deliverable, or one named after the job when none are listed. */
  protected readonly taskCount = computed(() => Math.max(1, this.request().deliverables.length));

  protected readonly projectOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Choose a project' },
    ...(this.options.value()?.projects ?? []).map((p) => ({ value: p.id, label: p.name, colour: p.colour })),
  ]);

  protected readonly peopleOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Unassigned' },
    ...(this.options.value()?.people ?? []).map((p) => ({ value: p.id, label: p.name, avatarColour: p.avatarColour })),
  ]);

  /** The job code starts as the proposed one; the committed date as the studio deadline. */
  protected readonly model = linkedSignal<AcceptForm>(() => ({
    projectName: this.newBrief.value()?.projectName ?? '',
    projectId: '',
    assigneePersonId: '',
    estimateHours: null,
    dueDate: this.request().requestedDueDate ?? '',
  }));

  protected readonly acceptForm = form(this.model, (accept) => {
    required(accept.projectName, { message: 'Name the new brief.', when: () => this.mode() === 'newBrief' });
    maxLength(accept.projectName, 200, { message: 'Keep the job code under 200 characters.' });
    required(accept.projectId, {
      message: 'Choose the project this work is for.',
      when: () => this.mode() === 'existing',
    });
    min(accept.estimateHours, 0, { message: "The estimate can't be negative." });
    max(accept.estimateHours, 999, { message: 'Keep the estimate under 1000 hours.' });
  });

  protected tabClass(mode: Mode): string {
    return segmentClass(this.mode() === mode);
  }

  protected async accept(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.acceptForm, async () => {
      const { projectName, projectId, assigneePersonId, estimateHours, dueDate } = this.model();
      const newBrief = this.mode() === 'newBrief';
      try {
        await this.requests.accept(this.request().id, {
          projectId: newBrief ? null : projectId,
          newProjectName: newBrief ? projectName.trim() : null,
          assigneePersonId: assigneePersonId || null,
          estimateHours,
          dueDate: dueDate || null,
        });
        this.toast.show(
          newBrief
            ? `Accepted. ${projectName.trim()} is on the board.`
            : `Accepted. "${this.request().title}" is on the board.`,
          'success',
        );
        this.done.emit();
      } catch (error) {
        this.toast.error(error);
      }
      return undefined;
    });
  }
}
