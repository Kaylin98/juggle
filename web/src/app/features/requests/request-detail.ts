import { DatePipe } from '@angular/common';
import { Component, inject, input, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { StatusChip } from '../../shared/status-chip';

/**
 * One job, for the marketing manager who sent the brief (CD5): its job ID and status, who does it and when, and
 * everything that was asked. Shown after sending one, too.
 */
@Component({
  selector: 'app-request-detail',
  imports: [DatePipe, RouterLink, StatusChip],
  template: `
    <div class="px-8 pt-2 pb-8">
      <a routerLink="/requests" class="btn-quiet inline-flex items-center gap-1">
        <!-- Heroicons arrow-left (mini, MIT) -->
        <svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
            clip-rule="evenodd"
          />
        </svg>
        My requests
      </a>

      @if (job.error()) {
        <p class="empty-state mt-6 text-over-700">
          This {{ auth.terms().job.toLowerCase() }} could not be loaded. It may not exist, or it was briefed by someone else.
        </p>
      } @else if (job.value(); as job) {
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

        <section class="panel mt-6 p-6" aria-label="Who does it and when">
          <dl class="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt class="label-caps">Designer</dt>
              <dd class="mt-1 font-semibold">{{ job.designerName ?? 'Not allocated yet' }}</dd>
            </div>
            <div>
              <dt class="label-caps">Planned start</dt>
              <dd class="mt-1 font-semibold">
                {{ job.plannedStartDate ? (job.plannedStartDate | date: 'EEE d MMM y') : 'Not scheduled yet' }}
              </dd>
            </div>
            <div>
              <dt class="label-caps">Expected completion</dt>
              <dd class="mt-1 font-semibold">
                {{ job.expectedCompletionDate ? (job.expectedCompletionDate | date: 'EEE d MMM y') : 'Not scheduled yet' }}
              </dd>
            </div>
          </dl>
        </section>

        <section class="panel mt-6 p-6" [attr.aria-label]="auth.terms().brief">
          <div class="grid gap-6 sm:grid-cols-2">
            <div>
              <h2 class="label-caps">Main goal</h2>
              <p class="mt-1 text-sm whitespace-pre-line" [class.text-ink-muted]="!job.mainGoal">
                {{ job.mainGoal ?? 'No main goal given.' }}
              </p>
            </div>
            <div>
              <h2 class="label-caps">Deliverables</h2>
              <ul class="mt-1 list-disc space-y-1 pl-5 text-sm">
                @for (deliverable of job.deliverables; track $index) {
                  <li>{{ deliverable }}</li>
                } @empty {
                  <li class="-ml-5 list-none text-ink-muted">No deliverables listed.</li>
                }
              </ul>
            </div>
          </div>
          <dl class="mt-6 grid gap-4 border-t border-line pt-6 text-sm sm:grid-cols-3">
            <div>
              <dt class="label-caps">Team</dt>
              <dd class="mt-1">{{ job.teamName }}</dd>
            </div>
            <div>
              <dt class="label-caps">{{ auth.departmentLabel() }}</dt>
              <dd class="mt-1">{{ job.department }}</dd>
            </div>
            <div>
              <dt class="label-caps">Priority</dt>
              <dd class="mt-1">{{ job.priority }}</dd>
            </div>
            <div>
              <dt class="label-caps">Required date</dt>
              <dd class="mt-1">{{ job.requiredDate ? (job.requiredDate | date: 'EEE d MMM y') : 'No date' }}</dd>
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
      } @else {
        <p class="empty-state mt-6">Loading...</p>
      }
    </div>
  `,
})
export class RequestDetailPage {
  private readonly jobs = inject(JobsService);
  protected readonly auth = inject(AuthService);

  /** From the `/requests/:id` route. */
  readonly id = input.required<string>();

  protected readonly job = resource({ params: () => this.id(), loader: ({ params }) => this.jobs.get(params) });
}
