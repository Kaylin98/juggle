import { DatePipe, Location } from '@angular/common';
import { Component, computed, inject, input, resource } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { StatusChip } from '../../shared/status-chip';
import { JobActions } from '../workflow/job-actions';
import { JobArtwork } from '../workflow/job-artwork';
import { JobTrail } from '../workflow/job-trail';
import {
  CATEGORY_LABELS,
  DELIVERABLE_LABELS,
  GUIDELINE_FIELDS,
  OBJECTIVE_FIELDS,
} from './brief-fields';

/**
 * One job, for the marketing manager who sent the brief (CD5): its job ID and status, who does it and when, and the
 * whole brief, sections A to F. Shown after sending one, too. Sections B and D list only what was filled in.
 */
@Component({
  selector: 'app-request-detail',
  imports: [DatePipe, JobActions, JobArtwork, JobTrail, StatusChip],
  template: `
    <div class="px-8 pt-2 pb-8">
      <button
        type="button"
        class="btn-quiet inline-flex items-center gap-1"
        (click)="location.back()"
      >
        <!-- Heroicons arrow-left (mini, MIT) -->
        <svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
            clip-rule="evenodd"
          />
        </svg>
        Back
      </button>

      @if (detail.error()) {
        <p class="empty-state mt-6 text-over-700">
          This {{ auth.terms().job.toLowerCase() }} could not be loaded. It may not exist, or it was
          briefed by someone else.
        </p>
      } @else if (detail.value(); as loaded) {
        @let job = loaded.job;
        @let brief = loaded.brief;
        <div class="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="flex items-center gap-2 text-sm text-ink-muted" [style.--hue]="job.colour">
              <span class="hue-dot size-2 shrink-0 rounded-full"></span>
              {{ job.code }}
            </p>
            <h1 class="page-title mt-1">{{ job.title }}</h1>
          </div>
          <app-status-chip class="text-sm" [name]="job.statusName" [colour]="job.statusColour" />
        </div>

        <app-job-actions class="mt-6 block empty:hidden" [job]="job" (changed)="detail.reload()" />

        <section class="panel mt-6 p-6" aria-label="Who does it and when">
          <dl class="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt class="label-caps">Designer</dt>
              <dd class="mt-1 font-semibold">{{ job.designerName ?? 'Not allocated yet' }}</dd>
            </div>
            <div>
              <dt class="label-caps">Planned start</dt>
              <dd class="mt-1 font-semibold">
                {{
                  job.plannedStartDate
                    ? (job.plannedStartDate | date: 'EEE d MMM y')
                    : 'Not scheduled yet'
                }}
              </dd>
            </div>
            <div>
              <dt class="label-caps">Expected completion</dt>
              <dd class="mt-1 font-semibold">
                {{
                  job.expectedCompletionDate
                    ? (job.expectedCompletionDate | date: 'EEE d MMM y')
                    : 'Not scheduled yet'
                }}
              </dd>
            </div>
          </dl>
        </section>

        <div class="mt-6 grid items-start gap-6 xl:grid-cols-2">
          <section class="panel p-6" aria-labelledby="job-a">
            <h2 id="job-a" class="font-display text-lg font-semibold">A. Job information</h2>
            <dl class="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt class="label-caps">{{ auth.departmentLabel() }}</dt>
                <dd class="mt-1">{{ job.department }}</dd>
              </div>
              <div>
                <dt class="label-caps">Campaign or project</dt>
                <dd class="mt-1" [class.text-ink-muted]="!brief.campaign">
                  {{ brief.campaign ?? 'Not given' }}
                </dd>
              </div>
              <div>
                <dt class="label-caps">Category</dt>
                <dd class="mt-1" [class.text-ink-muted]="!brief.category">
                  {{ brief.category ? categoryLabels[brief.category] : 'Not given' }}
                </dd>
              </div>
              <div>
                <dt class="label-caps">New job or revision</dt>
                <dd class="mt-1">
                  {{ brief.revisesJobCode ? 'Revision of ' + brief.revisesJobCode : 'New job' }}
                </dd>
              </div>
              <div>
                <dt class="label-caps">Required completion</dt>
                <dd class="mt-1">
                  {{ job.requiredDate ? (job.requiredDate | date: 'EEE d MMM y') : 'No date' }}
                </dd>
              </div>
              <div>
                <dt class="label-caps">Priority</dt>
                <dd class="mt-1">{{ job.priority }}</dd>
              </div>
              <div>
                <dt class="label-caps">Requested by</dt>
                <dd class="mt-1">{{ job.requesterName }}</dd>
              </div>
              <div>
                <dt class="label-caps">Briefed in</dt>
                <dd class="mt-1">{{ job.createdAt | date: 'EEE d MMM y, HH:mm' }}</dd>
              </div>
            </dl>
          </section>

          <section class="panel p-6" aria-labelledby="job-b">
            <h2 id="job-b" class="font-display text-lg font-semibold">B. Brief objectives</h2>
            <dl class="mt-4 space-y-4 text-sm">
              @for (field of objectives(); track field.label) {
                <div>
                  <dt class="label-caps">{{ field.label }}</dt>
                  <dd class="mt-1 whitespace-pre-line">{{ field.value }}</dd>
                </div>
              } @empty {
                <p class="text-ink-muted">No objectives given.</p>
              }
            </dl>
          </section>

          <section class="panel p-6" aria-labelledby="job-c">
            <h2 id="job-c" class="font-display text-lg font-semibold">C. Required deliverables</h2>
            <ul class="mt-4 space-y-4 text-sm">
              @for (deliverable of job.deliverables; track $index) {
                <li class="border-b border-line pb-4 last:border-b-0 last:pb-0">
                  <div class="flex flex-wrap items-baseline justify-between gap-2">
                    <span class="font-semibold">{{ deliverable.description }}</span>
                    <span class="text-ink-muted">{{
                      deliverable.dueDate ? 'By ' + (deliverable.dueDate | date: 'EEE d MMM') : ''
                    }}</span>
                  </div>
                  <p class="mt-1 text-ink-muted">
                    {{ deliverableLabels[deliverable.type] }}
                    @if (deliverable.specifications) {
                      &middot; {{ deliverable.specifications }}
                    }
                  </p>
                </li>
              } @empty {
                <li class="text-ink-muted">No deliverables listed.</li>
              }
            </ul>
          </section>

          <section class="panel p-6" aria-labelledby="job-d">
            <h2 id="job-d" class="font-display text-lg font-semibold">D. Creative guidelines</h2>
            <dl class="mt-4 space-y-4 text-sm">
              @for (field of guidelines(); track field.label) {
                <div>
                  <dt class="label-caps">{{ field.label }}</dt>
                  <dd class="mt-1 whitespace-pre-line">{{ field.value }}</dd>
                </div>
              } @empty {
                <p class="text-ink-muted">No guidelines given.</p>
              }
            </dl>
          </section>

          <section class="panel p-6" aria-labelledby="job-e">
            <h2 id="job-e" class="font-display text-lg font-semibold">E. Supporting material</h2>
            <ul class="mt-4 space-y-2 text-sm">
              @for (link of brief.links; track $index) {
                <li class="min-w-0">
                  <a
                    class="break-all font-semibold text-accent-700 hover:underline"
                    [href]="link.url"
                    target="_blank"
                    rel="noopener"
                  >
                    {{ link.label ?? link.url }}
                  </a>
                </li>
              } @empty {
                <li class="text-ink-muted">No links given.</li>
              }
            </ul>
          </section>

          <section class="panel p-6" aria-labelledby="job-f">
            <h2 id="job-f" class="font-display text-lg font-semibold">F. Additional information</h2>
            <p
              class="mt-4 text-sm whitespace-pre-line"
              [class.text-ink-muted]="!brief.additionalInformation"
            >
              {{ brief.additionalInformation ?? 'Nothing more given.' }}
            </p>
          </section>

          @if (loaded.artwork.length > 0) {
            <app-job-artwork class="xl:col-span-2" [artwork]="loaded.artwork" />
          }

          <app-job-trail class="xl:col-span-2" [history]="loaded.history" />
        </div>
      } @else {
        <p class="empty-state mt-6">Loading...</p>
      }
    </div>
  `,
})
export class RequestDetailPage {
  private readonly jobs = inject(JobsService);
  protected readonly location = inject(Location);
  protected readonly auth = inject(AuthService);

  /** From the `/requests/:id` route. */
  readonly id = input.required<string>();

  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly deliverableLabels = DELIVERABLE_LABELS;

  protected readonly detail = resource({
    params: () => this.id(),
    loader: ({ params }) => this.jobs.get(params),
  });

  /** The objectives that were filled in, with their labels, in the template's order. */
  protected readonly objectives = computed(() => {
    const objectives = this.detail.value()?.brief.objectives;
    return objectives
      ? filled(OBJECTIVE_FIELDS.map((f) => ({ label: f.label, value: objectives[f.key] })))
      : [];
  });

  /** The guidelines that were filled in, with their labels, in the template's order. */
  protected readonly guidelines = computed(() => {
    const guidelines = this.detail.value()?.brief.guidelines;
    return guidelines
      ? filled(GUIDELINE_FIELDS.map((f) => ({ label: f.label, value: guidelines[f.key] })))
      : [];
  });
}

function filled(
  fields: { label: string; value: string | null }[],
): { label: string; value: string }[] {
  return fields.filter((f): f is { label: string; value: string } => f.value !== null);
}
