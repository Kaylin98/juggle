import { Component, computed, inject, linkedSignal, resource } from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { Priority } from '../../core/models';
import { TeamContextService } from '../../core/team-context.service';
import { today } from '../../shared/dates';
import { Select, SelectOption } from '../../shared/select';
import { ToastService } from '../../shared/toast.service';
import { RequestGuide } from './request-guide';

/** The longest deliverable. */
const DELIVERABLE_MAX = 200;

interface RequestForm {
  teamId: string;
  departmentId: string;
  title: string;
  mainGoal: string;
  deliverables: string;
  requiredDate: string;
  priority: Priority;
}

/**
 * Sends a brief in the studio's template (D50), for users who brief work (SubmitBrief). It becomes a job with its job
 * ID at once (D63) and opens on its page. The form keeps to about 720px so it reads like a form, with a guide beside it, centred
 * together (an exception to the full-width page rule, asked for in the Phase 5 review). The team starts as the last
 * team the user viewed and the department as the first brand they manage. The signed-in user is always the requester
 * (D58).
 */
@Component({
  selector: 'app-request-form',
  imports: [FormField, RequestGuide, RouterLink, Select],
  template: `
    <!-- The form and its guide, centred together; under 1100px the guide moves below the form. -->
    <div class="px-8 pt-2 pb-8">
      <div class="mx-auto max-w-268">
        <h1 class="page-title">New {{ auth.terms().brief.toLowerCase() }}</h1>
        <p class="mt-1 text-sm text-ink-muted">
          Brief the studio on new work. It gets its {{ auth.terms().job.toLowerCase() }} ID as soon as you send it.
        </p>

        <div class="mt-6 grid items-start gap-8 min-[1100px]:grid-cols-[minmax(0,1fr)_20rem]">
          <div class="max-w-180 min-w-0">
            @if (options.error()) {
              <p class="empty-state text-over-700">
                The form could not be loaded. Refresh the page to try again.
              </p>
            } @else if (options.hasValue()) {
              <form class="panel p-8" novalidate (submit)="send($event)">
                <div class="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label class="form-label" for="request-team">Team</label>
                    <app-select
                      triggerId="request-team"
                      [options]="teamOptions()"
                      [formField]="requestForm.teamId"
                    />
                    @if (requestForm.teamId().touched() && requestForm.teamId().invalid()) {
                      <p class="field-error">{{ requestForm.teamId().errors()[0].message }}</p>
                    }
                  </div>
                  <div>
                    <label class="form-label" for="request-department">{{ auth.departmentLabel() }}</label>
                    <app-select
                      triggerId="request-department"
                      [options]="departmentOptions()"
                      [formField]="requestForm.departmentId"
                    />
                    @if (
                      requestForm.departmentId().touched() && requestForm.departmentId().invalid()
                    ) {
                      <p class="field-error">
                        {{ requestForm.departmentId().errors()[0].message }}
                      </p>
                    }
                  </div>
                  <div class="sm:col-span-2">
                    <label class="form-label" for="request-title">Job name</label>
                    <input
                      id="request-title"
                      class="form-input"
                      placeholder="Black Friday"
                      [formField]="requestForm.title"
                    />
                    @if (requestForm.title().touched() && requestForm.title().invalid()) {
                      <p class="field-error">{{ requestForm.title().errors()[0].message }}</p>
                    }
                  </div>
                  <div class="sm:col-span-2">
                    <label class="form-label" for="request-goal">Main goal</label>
                    <textarea
                      id="request-goal"
                      class="form-input"
                      rows="3"
                      placeholder="What the work is for and what a good result looks like"
                      [formField]="requestForm.mainGoal"
                    ></textarea>
                    @if (requestForm.mainGoal().touched() && requestForm.mainGoal().invalid()) {
                      <p class="field-error">{{ requestForm.mainGoal().errors()[0].message }}</p>
                    }
                  </div>
                  <div class="sm:col-span-2">
                    <label class="form-label" for="request-deliverables">Deliverables, one per line</label>
                    <textarea
                      id="request-deliverables"
                      class="form-input"
                      rows="5"
                      placeholder="Takealot banners&#10;A4 insert: Cameraland&#10;Social tiles x6"
                      [formField]="requestForm.deliverables"
                    ></textarea>
                    @if (
                      requestForm.deliverables().touched() && requestForm.deliverables().invalid()
                    ) {
                      <p class="field-error">{{ requestForm.deliverables().errors()[0].message }}</p>
                    }
                  </div>
                  <div>
                    <label class="form-label" for="request-due">Studio deadline</label>
                    <input
                      id="request-due"
                      class="form-input"
                      type="date"
                      [min]="today"
                      [formField]="requestForm.requiredDate"
                    />
                    @if (
                      requestForm.requiredDate().touched() &&
                      requestForm.requiredDate().invalid()
                    ) {
                      <p class="field-error">
                        {{ requestForm.requiredDate().errors()[0].message }}
                      </p>
                    }
                  </div>
                  <div>
                    <label class="form-label" for="request-priority">Priority</label>
                    <app-select
                      triggerId="request-priority"
                      [options]="priorityOptions()"
                      [formField]="requestForm.priority"
                    />
                  </div>
                </div>
                <div class="mt-8 flex justify-end gap-2">
                  <a routerLink="/requests" class="btn-secondary inline-flex items-center"
                    >Cancel</a
                  >
                  <button type="submit" class="btn-primary" [disabled]="requestForm().submitting()">
                    Send {{ auth.terms().brief.toLowerCase() }}
                  </button>
                </div>
              </form>
            } @else {
              <p class="empty-state">Loading the form...</p>
            }
          </div>
          <app-request-guide class="block max-w-180 min-[1100px]:sticky min-[1100px]:top-6" />
        </div>
      </div>
    </div>
  `,
})
export class RequestFormPage {
  private readonly jobs = inject(JobsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly teamContext = inject(TeamContextService);
  protected readonly auth = inject(AuthService);

  protected readonly today = today();
  /** The org's word for a department, lower case, such as "brand" (D48). */
  protected readonly departmentLabel = computed(() => this.auth.departmentLabel().toLowerCase());
  protected readonly options = resource({ loader: () => this.jobs.options() });

  protected readonly teamOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Choose a team' },
    ...(this.options.value()?.teams ?? []).map((t) => ({ value: t.id, label: t.name, colour: t.colour })),
  ]);
  protected readonly departmentOptions = computed<SelectOption[]>(() => [
    { value: '', label: `Choose a ${this.departmentLabel()}` },
    ...(this.options.value()?.departments ?? []).map((d) => ({ value: d.id, label: d.name })),
  ]);
  protected readonly priorityOptions = computed<SelectOption[]>(() =>
    (this.options.value()?.priorities ?? []).map((p) => ({ value: p, label: p })),
  );

  protected readonly model = linkedSignal<RequestForm>(() => ({
    teamId: this.teamContext.teamId() ?? '',
    departmentId: this.options.value()?.myDepartmentId ?? '',
    title: '',
    mainGoal: '',
    deliverables: '',
    requiredDate: '',
    priority: 'Medium',
  }));

  protected readonly requestForm = form(this.model, (request) => {
    required(request.teamId, { message: 'Choose the team to ask.' });
    required(request.departmentId, { message: () => `Choose your ${this.departmentLabel()}.` });
    required(request.title, { message: 'Give the job a name.' });
    maxLength(request.title, 200, { message: 'Keep the job name under 200 characters.' });
    maxLength(request.mainGoal, 2000, { message: 'Keep the main goal under 2000 characters.' });
    maxLength(request.deliverables, 4000, { message: 'Keep the deliverables under 4000 characters.' });
    validate(request.deliverables, ({ value }) =>
      value()
        .split('\n')
        .some((line) => line.trim().length > DELIVERABLE_MAX)
        ? { kind: 'deliverable', message: `Keep each deliverable under ${DELIVERABLE_MAX} characters.` }
        : undefined,
    );
    validate(request.requiredDate, ({ value }) =>
      value() && value() < this.today
        ? { kind: 'past', message: "The deadline can't be in the past." }
        : undefined,
    );
  });

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.requestForm, async () => {
      const { title, mainGoal, deliverables, requiredDate, ...rest } = this.model();
      try {
        const created = await this.jobs.submit({
          ...rest,
          title: title.trim(),
          mainGoal: mainGoal.trim() || null,
          deliverables: deliverables.trim() || null,
          requiredDate: requiredDate || null,
        });
        this.toast.show(`${this.auth.terms().brief} sent as ${created.code}.`, 'success');
        await this.router.navigate(['/requests', created.id]);
      } catch (error) {
        this.toast.error(error);
      }
      return undefined;
    });
  }
}
