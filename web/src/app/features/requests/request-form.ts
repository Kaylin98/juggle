import { Component, computed, inject, linkedSignal, resource } from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { Priority, RequestType } from '../../core/models';
import { RequestsService } from '../../core/requests.service';
import { today } from '../../shared/dates';
import { Select, SelectOption } from '../../shared/select';
import { ToastService } from '../../shared/toast.service';

interface RequestForm {
  teamId: string;
  workType: RequestType | '';
  title: string;
  description: string;
  departmentId: string;
  requestedDueDate: string;
  priority: Priority;
}

/** Asks a team for work. Anyone can submit; on submit it shows the request and its status. */
@Component({
  selector: 'app-request-form',
  imports: [FormField, Select],
  template: `
    <div class="px-8 pt-2 pb-8">
      <h1 class="page-title">New request</h1>
      <p class="mt-1 text-sm text-ink-muted">Ask a team for work. They will triage it and let you know.</p>

      @if (options.error()) {
        <p class="empty-state mt-6 text-over-700">The form could not be loaded. Refresh the page to try again.</p>
      } @else if (options.hasValue()) {
        <form class="panel mt-6 p-8" novalidate (submit)="send($event)">
          <div class="grid gap-6 lg:grid-cols-2">
            <div>
              <label class="form-label" for="request-team">Team</label>
              <app-select triggerId="request-team" [options]="teamOptions()" [formField]="requestForm.teamId" />
              @if (requestForm.teamId().touched() && requestForm.teamId().invalid()) {
                <p class="field-error">{{ requestForm.teamId().errors()[0].message }}</p>
              }
            </div>
            <div>
              <label class="form-label" for="request-type">Type of work</label>
              <app-select triggerId="request-type" [options]="typeOptions()" [formField]="requestForm.workType" />
              @if (requestForm.workType().touched() && requestForm.workType().invalid()) {
                <p class="field-error">{{ requestForm.workType().errors()[0].message }}</p>
              }
            </div>
            <div class="lg:col-span-2">
              <label class="form-label" for="request-title">Title</label>
              <input id="request-title" class="form-input" [formField]="requestForm.title" />
              @if (requestForm.title().touched() && requestForm.title().invalid()) {
                <p class="field-error">{{ requestForm.title().errors()[0].message }}</p>
              }
            </div>
            <div class="lg:col-span-2">
              <label class="form-label" for="request-description">Description</label>
              <textarea id="request-description" class="form-input" rows="5" [formField]="requestForm.description"></textarea>
              @if (requestForm.description().touched() && requestForm.description().invalid()) {
                <p class="field-error">{{ requestForm.description().errors()[0].message }}</p>
              }
            </div>
            <div>
              <label class="form-label" for="request-department">Your department</label>
              <app-select triggerId="request-department" [options]="departmentOptions()" [formField]="requestForm.departmentId" />
              @if (requestForm.departmentId().touched() && requestForm.departmentId().invalid()) {
                <p class="field-error">{{ requestForm.departmentId().errors()[0].message }}</p>
              }
            </div>
            <div class="grid grid-cols-2 gap-6">
              <div>
                <label class="form-label" for="request-due">Needed by</label>
                <input id="request-due" class="form-input" type="date" [min]="today" [formField]="requestForm.requestedDueDate" />
                @if (requestForm.requestedDueDate().touched() && requestForm.requestedDueDate().invalid()) {
                  <p class="field-error">{{ requestForm.requestedDueDate().errors()[0].message }}</p>
                }
              </div>
              <div>
                <label class="form-label" for="request-priority">Priority</label>
                <app-select triggerId="request-priority" [options]="priorityOptions()" [formField]="requestForm.priority" />
              </div>
            </div>
          </div>
          <div class="mt-8 flex justify-end">
            <button type="submit" class="btn-primary" [disabled]="requestForm().submitting()">Send request</button>
          </div>
        </form>
      } @else {
        <p class="empty-state mt-6">Loading the form...</p>
      }
    </div>
  `,
})
export class RequestFormPage {
  private readonly requests = inject(RequestsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly today = today();
  protected readonly options = resource({ loader: () => this.requests.options() });

  protected readonly teamOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Choose a team' },
    ...(this.options.value()?.teams ?? []).map((t) => ({ value: t.id, label: t.name })),
  ]);
  protected readonly typeOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Choose a type' },
    ...(this.options.value()?.types ?? []).map((t) => ({ value: t, label: t })),
  ]);
  protected readonly departmentOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Choose a department' },
    ...(this.options.value()?.departments ?? []).map((d) => ({ value: d.id, label: d.name })),
  ]);
  protected readonly priorityOptions = computed<SelectOption[]>(() =>
    (this.options.value()?.priorities ?? []).map((p) => ({ value: p, label: p })),
  );

  protected readonly model = linkedSignal<RequestForm>(() => ({
    teamId: '',
    workType: '',
    title: '',
    description: '',
    departmentId: this.options.value()?.myDepartmentId ?? '',
    requestedDueDate: '',
    priority: 'Medium',
  }));

  protected readonly requestForm = form(this.model, (request) => {
    required(request.teamId, { message: 'Choose the team to ask.' });
    required(request.workType, { message: 'Choose the type of work.' });
    required(request.title, { message: 'Give the request a title.' });
    maxLength(request.title, 200, { message: 'Keep the title under 200 characters.' });
    maxLength(request.description, 4000, { message: 'Keep the description under 4000 characters.' });
    required(request.departmentId, { message: 'Choose your department.' });
    validate(request.requestedDueDate, ({ value }) =>
      value() && value() < this.today ? { kind: 'past', message: "The date can't be in the past." } : undefined,
    );
  });

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.requestForm, async () => {
      const { workType, title, description, requestedDueDate, ...rest } = this.model();
      try {
        const created = await this.requests.create({
          ...rest,
          type: workType as RequestType,
          title: title.trim(),
          description: description.trim() || null,
          requestedDueDate: requestedDueDate || null,
        });
        await this.router.navigate(['/requests', created.id]);
      } catch (error) {
        this.toast.error(error);
      }
      return undefined;
    });
  }
}
