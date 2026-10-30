import { Component, computed, inject, input, linkedSignal, output, resource } from '@angular/core';
import { FormField, form, max, min, required, submit } from '@angular/forms/signals';
import { WorkRequest } from '../../core/models';
import { RequestsService } from '../../core/requests.service';
import { Select, SelectOption } from '../../shared/select';
import { ToastService } from '../../shared/toast.service';
import { RequestSummary } from './request-summary';

interface AcceptForm {
  projectId: string;
  assigneePersonId: string;
  estimateHours: number | null;
  dueDate: string;
}

/** Turns a request into a task in the first column after Triage (D18): project, assignee, estimate, committed date. */
@Component({
  selector: 'app-accept-dialog',
  imports: [FormField, RequestSummary, Select],
  template: `
    <form class="px-6 pb-6" novalidate (submit)="accept($event)">
      <app-request-summary [request]="request()" />

      <div class="mt-6 space-y-4">
        <div>
          <label class="form-label" for="accept-project">Project</label>
          <app-select triggerId="accept-project" [options]="projectOptions()" [formField]="acceptForm.projectId" />
          @if (acceptForm.projectId().touched() && acceptForm.projectId().invalid()) {
            <p class="field-error">{{ acceptForm.projectId().errors()[0].message }}</p>
          }
        </div>
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
        }
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="closed.emit()">Cancel</button>
        <button type="submit" class="btn-primary" [disabled]="acceptForm().submitting()">Accept</button>
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

  protected readonly projectOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Choose a project' },
    ...(this.options.value()?.projects ?? []).map((p) => ({ value: p.id, label: p.name, colour: p.colour })),
  ]);

  protected readonly peopleOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Unassigned' },
    ...(this.options.value()?.people ?? []).map((p) => ({ value: p.id, label: p.name, avatarColour: p.avatarColour })),
  ]);

  /** The committed date starts as the date the requester asked for. */
  protected readonly model = linkedSignal<AcceptForm>(() => ({
    projectId: '',
    assigneePersonId: '',
    estimateHours: null,
    dueDate: this.request().requestedDueDate ?? '',
  }));

  protected readonly acceptForm = form(this.model, (accept) => {
    required(accept.projectId, { message: 'Choose the project this work is for.' });
    min(accept.estimateHours, 0, { message: "The estimate can't be negative." });
    max(accept.estimateHours, 999, { message: 'Keep the estimate under 1000 hours.' });
  });

  protected async accept(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.acceptForm, async () => {
      const { projectId, assigneePersonId, estimateHours, dueDate } = this.model();
      try {
        await this.requests.accept(this.request().id, {
          projectId,
          assigneePersonId: assigneePersonId || null,
          estimateHours,
          dueDate: dueDate || null,
        });
        this.toast.show(`Accepted. "${this.request().title}" is on the board.`, 'success');
        this.done.emit();
      } catch (error) {
        this.toast.error(error);
      }
      return undefined;
    });
  }
}
