import { Component, computed, inject, linkedSignal, resource } from '@angular/core';
import { FormField, applyEach, form, maxLength, pattern, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { BriefObjectives, CreateJob, CreativeGuidelines, DeliverableType, JobCategory, Priority } from '../../core/models';
import { TeamContextService } from '../../core/team-context.service';
import { today } from '../../shared/dates';
import { segmentClass } from '../../shared/segment';
import { Select, SelectOption } from '../../shared/select';
import { ToastService } from '../../shared/toast.service';
import { CATEGORY_LABELS, DELIVERABLE_LABELS, GUIDELINE_FIELDS, OBJECTIVE_FIELDS } from './brief-fields';
import { RequestGuide } from './request-guide';

/** Most deliverables and links one brief takes, as the API does. */
const MAX_ROWS = 20;

interface DeliverableRow {
  type: DeliverableType;
  description: string;
  specifications: string;
  dueDate: string;
}

interface LinkRow {
  url: string;
  label: string;
}

/** Form fields as the inputs hold them: empty strings for blank values. */
interface BriefForm {
  teamId: string;
  departmentId: string;
  title: string;
  campaign: string;
  category: JobCategory | '';
  /** A revision of an existing job rather than a new job. */
  revision: boolean;
  revisesJobCode: string;
  requiredDate: string;
  priority: Priority;
  objectives: Record<keyof BriefObjectives, string>;
  deliverables: DeliverableRow[];
  guidelines: Record<keyof CreativeGuidelines, string>;
  links: LinkRow[];
  additionalInformation: string;
}

const blankDeliverable = (): DeliverableRow => ({ type: 'SocialMedia', description: '', specifications: '', dueDate: '' });
const blankLink = (): LinkRow => ({ url: '', label: '' });
const blank = <T extends string>(keys: { key: T }[]) => Object.fromEntries(keys.map((f) => [f.key, ''])) as Record<T, string>;
const orNull = (text: string) => text.trim() || null;

function toCreateJob(value: BriefForm): CreateJob {
  const trimmed = <T extends string>(fields: Record<T, string>) =>
    Object.fromEntries(Object.entries<string>(fields).map(([key, text]) => [key, orNull(text)])) as Record<T, string | null>;
  return {
    teamId: value.teamId,
    departmentId: value.departmentId,
    title: value.title.trim(),
    campaign: orNull(value.campaign),
    category: value.category || null,
    revisesJobCode: value.revision ? orNull(value.revisesJobCode) : null,
    requiredDate: value.requiredDate || null,
    priority: value.priority,
    objectives: trimmed(value.objectives),
    deliverables: value.deliverables.map((d) => ({
      type: d.type,
      description: d.description.trim(),
      specifications: orNull(d.specifications),
      dueDate: d.dueDate || null,
    })),
    guidelines: trimmed(value.guidelines),
    links: value.links.map((l) => ({ url: l.url.trim(), label: orNull(l.label) })),
    additionalInformation: orNull(value.additionalInformation),
  };
}

/**
 * Sends a brief in the client's template, sections A to F of 3.1 (D50, J.4), for users who brief work (SubmitBrief).
 * It becomes a job with its job ID at once (D63) and opens on its page. The form keeps to about 720px so it reads like a
 * form, with a guide beside it, centred together (an exception to the full-width page rule, asked for in the Phase 5
 * review). The team starts as the last team the user viewed, or the only team there is (marketing managers are in no
 * team, D73), and the brand as the first brand they manage. The signed-in user is always the requester (D58).
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
              <p class="empty-state text-over-700">The form could not be loaded. Refresh the page to try again.</p>
            } @else if (options.hasValue()) {
              <form class="space-y-6" novalidate (submit)="send($event)">
                <section class="panel p-8" aria-labelledby="brief-a">
                  <h2 id="brief-a" class="font-display text-lg font-semibold">A. Job information</h2>
                  <div class="mt-6 grid gap-6 sm:grid-cols-2">
                    @if (options.value().teams.length > 1) {
                      <div>
                        <label class="form-label" for="brief-team">Team</label>
                        <app-select triggerId="brief-team" [options]="teamOptions()" [formField]="briefForm.teamId" />
                        @if (briefForm.teamId().touched() && briefForm.teamId().invalid()) {
                          <p class="field-error">{{ briefForm.teamId().errors()[0].message }}</p>
                        }
                      </div>
                    }
                    <div>
                      <label class="form-label" for="brief-department">{{ auth.departmentLabel() }}</label>
                      <app-select triggerId="brief-department" [options]="departmentOptions()" [formField]="briefForm.departmentId" />
                      @if (briefForm.departmentId().touched() && briefForm.departmentId().invalid()) {
                        <p class="field-error">{{ briefForm.departmentId().errors()[0].message }}</p>
                      }
                    </div>
                    <div class="sm:col-span-2">
                      <label class="form-label" for="brief-title">Job title</label>
                      <input id="brief-title" class="form-input" placeholder="Summer Holiday Sale" [formField]="briefForm.title" />
                      @if (briefForm.title().touched() && briefForm.title().invalid()) {
                        <p class="field-error">{{ briefForm.title().errors()[0].message }}</p>
                      }
                    </div>
                    <div>
                      <label class="form-label" for="brief-campaign">Campaign or project</label>
                      <input id="brief-campaign" class="form-input" [formField]="briefForm.campaign" />
                      @if (briefForm.campaign().touched() && briefForm.campaign().invalid()) {
                        <p class="field-error">{{ briefForm.campaign().errors()[0].message }}</p>
                      }
                    </div>
                    <div>
                      <label class="form-label" for="brief-category">Category</label>
                      <app-select triggerId="brief-category" [options]="categoryOptions()" [formField]="briefForm.category" />
                    </div>
                    <div>
                      <label class="form-label" for="brief-required">Required completion date</label>
                      <input id="brief-required" class="form-input" type="date" [min]="today" [formField]="briefForm.requiredDate" />
                      @if (briefForm.requiredDate().touched() && briefForm.requiredDate().invalid()) {
                        <p class="field-error">{{ briefForm.requiredDate().errors()[0].message }}</p>
                      }
                    </div>
                    <div>
                      <label class="form-label" for="brief-priority">Priority</label>
                      <app-select triggerId="brief-priority" [options]="priorityOptions()" [formField]="briefForm.priority" />
                    </div>
                    <div class="sm:col-span-2">
                      <span class="form-label" id="brief-kind">New job or revision</span>
                      <div class="flex max-w-sm rounded-full border border-line bg-surface p-1" role="radiogroup" aria-labelledby="brief-kind">
                        <button type="button" role="radio" [class]="kindClass(false)" [attr.aria-checked]="!model().revision" (click)="setRevision(false)">
                          New job
                        </button>
                        <button type="button" role="radio" [class]="kindClass(true)" [attr.aria-checked]="model().revision" (click)="setRevision(true)">
                          Revision of a job
                        </button>
                      </div>
                    </div>
                    @if (model().revision) {
                      <div class="sm:col-span-2">
                        <label class="form-label" for="brief-revises">The existing {{ auth.terms().job.toLowerCase() }}'s ID</label>
                        <input id="brief-revises" class="form-input" placeholder="DJI0141_Q1'27_Black Friday" [formField]="briefForm.revisesJobCode" />
                        @if (briefForm.revisesJobCode().touched() && briefForm.revisesJobCode().invalid()) {
                          <p class="field-error">{{ briefForm.revisesJobCode().errors()[0].message }}</p>
                        }
                      </div>
                    }
                  </div>
                </section>

                <section class="panel p-8" aria-labelledby="brief-b">
                  <h2 id="brief-b" class="font-display text-lg font-semibold">B. Brief objectives</h2>
                  <div class="mt-6 grid gap-6 sm:grid-cols-2">
                    @for (field of objectiveFields; track field.key) {
                      @let state = briefForm.objectives[field.key];
                      <div [class]="field.key === 'purpose' ? 'sm:col-span-2' : ''">
                        <label class="form-label" [for]="'brief-' + field.key">{{ field.label }}</label>
                        <textarea [id]="'brief-' + field.key" class="form-input" rows="2" [formField]="state"></textarea>
                        @if (state().touched() && state().invalid()) {
                          <p class="field-error">{{ state().errors()[0].message }}</p>
                        }
                      </div>
                    }
                  </div>
                </section>

                <section class="panel p-8" aria-labelledby="brief-c">
                  <h2 id="brief-c" class="font-display text-lg font-semibold">C. Required deliverables</h2>
                  <p class="mt-1 text-sm text-ink-muted">Add each piece of artwork, with its own size, specifications and deadline.</p>
                  <ol class="mt-6 space-y-4">
                    @for (item of briefForm.deliverables; track item; let i = $index) {
                      <li class="rounded-control bg-surface-muted p-4" [attr.aria-label]="'Deliverable ' + (i + 1)">
                        <div class="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
                          <div>
                            <label class="form-label" [for]="'deliverable-type-' + i">Type</label>
                            <app-select [triggerId]="'deliverable-type-' + i" [options]="deliverableTypeOptions()" [formField]="item.type" />
                          </div>
                          <div>
                            <label class="form-label" [for]="'deliverable-description-' + i">Deliverable</label>
                            <input [id]="'deliverable-description-' + i" class="form-input" placeholder="Takealot banners" [formField]="item.description" />
                            @if (item.description().touched() && item.description().invalid()) {
                              <p class="field-error">{{ item.description().errors()[0].message }}</p>
                            }
                          </div>
                          <div class="sm:col-span-2 grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
                            <div>
                              <label class="form-label" [for]="'deliverable-specs-' + i">Dimensions and specifications</label>
                              <input [id]="'deliverable-specs-' + i" class="form-input" placeholder="1200 x 628, JPG" [formField]="item.specifications" />
                              @if (item.specifications().touched() && item.specifications().invalid()) {
                                <p class="field-error">{{ item.specifications().errors()[0].message }}</p>
                              }
                            </div>
                            <div>
                              <label class="form-label" [for]="'deliverable-due-' + i">Deadline</label>
                              <div class="relative">
                                <input [id]="'deliverable-due-' + i" class="form-input peer" type="date" [min]="today" [max]="model().requiredDate || null" [formField]="item.dueDate" />
                                @if (!item.dueDate().value()) {
                                  <span class="pointer-events-none absolute inset-y-px left-px right-10 flex items-center rounded-l-control bg-surface pl-3 text-sm text-ink-faint peer-focus:hidden">Same as job</span>
                                }
                              </div>
                              @if (item.dueDate().touched() && item.dueDate().invalid()) {
                                <p class="field-error">{{ item.dueDate().errors()[0].message }}</p>
                              }
                            </div>
                          </div>
                        </div>
                        <div class="mt-2 flex justify-end">
                          <button type="button" class="btn-quiet" (click)="removeDeliverable(i)">Remove</button>
                        </div>
                      </li>
                    }
                  </ol>
                  @if (model().deliverables.length < maxRows) {
                    <button type="button" class="btn-secondary mt-4" (click)="addDeliverable()">Add a deliverable</button>
                  }
                </section>

                <section class="panel p-8" aria-labelledby="brief-d">
                  <h2 id="brief-d" class="font-display text-lg font-semibold">D. Creative guidelines</h2>
                  <div class="mt-6 grid gap-6 sm:grid-cols-2">
                    @for (field of guidelineFields; track field.key) {
                      @let state = briefForm.guidelines[field.key];
                      <div>
                        <label class="form-label" [for]="'brief-' + field.key">{{ field.label }}</label>
                        <textarea [id]="'brief-' + field.key" class="form-input" rows="2" [formField]="state"></textarea>
                        @if (state().touched() && state().invalid()) {
                          <p class="field-error">{{ state().errors()[0].message }}</p>
                        }
                      </div>
                    }
                  </div>
                </section>

                <section class="panel p-8" aria-labelledby="brief-e">
                  <h2 id="brief-e" class="font-display text-lg font-semibold">E. Supporting material</h2>
                  <p class="mt-1 text-sm text-ink-muted">
                    Links to existing artwork, brand guidelines, reference and product images, campaign documents or approved copy,
                    such as a SharePoint or Google Drive folder.
                  </p>
                  <ol class="mt-6 space-y-4">
                    @for (link of briefForm.links; track link; let i = $index) {
                      <li class="grid items-start gap-4 sm:grid-cols-[12rem_minmax(0,1fr)_auto]" [attr.aria-label]="'Link ' + (i + 1)">
                        <div>
                          <label class="form-label" [for]="'link-label-' + i">Label</label>
                          <input [id]="'link-label-' + i" class="form-input" placeholder="Brand guidelines" [formField]="link.label" />
                          @if (link.label().touched() && link.label().invalid()) {
                            <p class="field-error">{{ link.label().errors()[0].message }}</p>
                          }
                        </div>
                        <div>
                          <label class="form-label" [for]="'link-url-' + i">Link</label>
                          <input [id]="'link-url-' + i" class="form-input" type="url" placeholder="https://" [formField]="link.url" />
                          @if (link.url().touched() && link.url().invalid()) {
                            <p class="field-error">{{ link.url().errors()[0].message }}</p>
                          }
                        </div>
                        <button type="button" class="btn-quiet sm:mt-7" (click)="removeLink(i)">Remove</button>
                      </li>
                    }
                  </ol>
                  @if (model().links.length < maxRows) {
                    <button type="button" class="btn-secondary mt-4" (click)="addLink()">Add a link</button>
                  }
                </section>

                <section class="panel p-8" aria-labelledby="brief-f">
                  <h2 id="brief-f" class="font-display text-lg font-semibold">F. Additional information</h2>
                  <label class="form-label mt-6" for="brief-additional">Anything else that will help the designer</label>
                  <textarea id="brief-additional" class="form-input" rows="4" [formField]="briefForm.additionalInformation"></textarea>
                  @if (briefForm.additionalInformation().touched() && briefForm.additionalInformation().invalid()) {
                    <p class="field-error">{{ briefForm.additionalInformation().errors()[0].message }}</p>
                  }
                </section>

                <div class="flex justify-end gap-2">
                  <a routerLink="/requests" class="btn-secondary inline-flex items-center">Cancel</a>
                  <button type="submit" class="btn-primary" [disabled]="briefForm().submitting()">
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
  protected readonly maxRows = MAX_ROWS;
  protected readonly objectiveFields = OBJECTIVE_FIELDS;
  protected readonly guidelineFields = GUIDELINE_FIELDS;
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
  protected readonly categoryOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Choose a category' },
    ...(this.options.value()?.categories ?? []).map((c) => ({ value: c, label: CATEGORY_LABELS[c] })),
  ]);
  protected readonly deliverableTypeOptions = computed<SelectOption[]>(() =>
    (this.options.value()?.deliverableTypes ?? []).map((t) => ({ value: t, label: DELIVERABLE_LABELS[t] })),
  );

  protected readonly model = linkedSignal<BriefForm>(() => ({
    teamId: this.onlyTeamId() || (this.teamContext.teamId() ?? ''),
    departmentId: this.options.value()?.myDepartmentId ?? '',
    title: '',
    campaign: '',
    category: '',
    revision: false,
    revisesJobCode: '',
    requiredDate: '',
    priority: 'Medium',
    objectives: blank(OBJECTIVE_FIELDS),
    deliverables: [blankDeliverable()],
    guidelines: blank(GUIDELINE_FIELDS),
    links: [],
    additionalInformation: '',
  }));

  protected readonly briefForm = form(this.model, (brief) => {
    const notPast = (date: string) => (date && date < this.today ? { kind: 'past', message: "The deadline can't be in the past." } : undefined);
    required(brief.teamId, { message: 'Choose the team to ask.' });
    required(brief.departmentId, { message: () => `Choose your ${this.departmentLabel()}.` });
    required(brief.title, { message: 'Give the job a title.' });
    maxLength(brief.title, 200, { message: 'Keep the title under 200 characters.' });
    maxLength(brief.campaign, 200, { message: 'Keep the campaign under 200 characters.' });
    maxLength(brief.revisesJobCode, 300, { message: 'Keep the ID under 300 characters.' });
    validate(brief.requiredDate, ({ value }) => notPast(value()));
    for (const field of OBJECTIVE_FIELDS) {
      maxLength(brief.objectives[field.key], field.max, { message: `Keep this under ${field.max} characters.` });
    }
    applyEach(brief.deliverables, (item) => {
      required(item.description, { message: 'Say what the deliverable is.' });
      maxLength(item.description, 200, { message: 'Keep this under 200 characters.' });
      maxLength(item.specifications, 500, { message: 'Keep the specifications under 500 characters.' });
      validate(item.dueDate, ({ value }) => notPast(value()));
      validate(item.dueDate, ({ value }) => {
        const required = this.model().requiredDate;
        return value() && required && value() > required
          ? { kind: 'afterJob', message: "A deliverable can't be due after the job's required date." }
          : undefined;
      });
    });
    for (const field of GUIDELINE_FIELDS) {
      maxLength(brief.guidelines[field.key], field.max, { message: `Keep this under ${field.max} characters.` });
    }
    applyEach(brief.links, (link) => {
      required(link.url, { message: 'Paste the link.' });
      pattern(link.url, /^https?:\/\/\S+$/, { message: 'Use a full link, starting with https://.' });
      maxLength(link.url, 1000, { message: 'Keep the link under 1000 characters.' });
      maxLength(link.label, 200, { message: 'Keep the label under 200 characters.' });
    });
    maxLength(brief.additionalInformation, 2000, { message: 'Keep this under 2000 characters.' });
  });

  protected kindClass(revision: boolean): string {
    return segmentClass(this.model().revision === revision);
  }

  protected setRevision(revision: boolean): void {
    this.model.update((m) => ({ ...m, revision }));
  }

  protected addDeliverable(): void {
    this.model.update((m) => ({ ...m, deliverables: [...m.deliverables, blankDeliverable()] }));
  }

  protected removeDeliverable(index: number): void {
    this.model.update((m) => ({ ...m, deliverables: m.deliverables.filter((_, i) => i !== index) }));
  }

  protected addLink(): void {
    this.model.update((m) => ({ ...m, links: [...m.links, blankLink()] }));
  }

  protected removeLink(index: number): void {
    this.model.update((m) => ({ ...m, links: m.links.filter((_, i) => i !== index) }));
  }

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.briefForm, async () => {
      try {
        const { job } = await this.jobs.submit(toCreateJob(this.model()));
        this.toast.show(`${this.auth.terms().brief} sent as ${job.code}.`, 'success');
        await this.router.navigate(['/requests', job.id]);
      } catch (error) {
        this.toast.error(error);
      }
      return undefined;
    });
  }

  /** The only team to brief, when there is just one. */
  private onlyTeamId(): string {
    const teams = this.options.value()?.teams ?? [];
    return teams.length === 1 ? teams[0].id : '';
  }
}
