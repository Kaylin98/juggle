import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { RequestStatus } from '../../core/models';
import { RequestsService } from '../../core/requests.service';
import { StatusPill } from './status-pill';

const NOTE: Record<RequestStatus, string> = {
  New: 'Waiting for the team to triage it.',
  Accepted: 'The team has taken it on.',
  Rejected: 'The team could not take it on.',
};

/** One request: everything that was asked, its status, and the team's answer. Shown after sending one, too. */
@Component({
  selector: 'app-request-detail',
  imports: [DatePipe, RouterLink, StatusPill],
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

      @if (request.error()) {
        <p class="empty-state mt-6 text-over-700">
          This request could not be loaded. It may not exist, or it was sent by someone else.
        </p>
      } @else if (request.value(); as request) {
        <div class="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <h1 class="page-title">{{ request.title }}</h1>
            <p class="mt-1 text-sm text-ink-muted">{{ note() }}</p>
          </div>
          <app-status-pill [status]="request.status" />
        </div>

        @if (request.status === 'Accepted') {
          <section class="panel mt-6 p-6" aria-label="The team's answer">
            <dl class="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt class="label-caps">Assignee</dt>
                <dd class="mt-1 font-semibold">{{ request.assigneeName ?? 'Not assigned yet' }}</dd>
              </div>
              <div>
                <dt class="label-caps">Committed due date</dt>
                <dd class="mt-1 font-semibold">
                  {{ request.committedDueDate ? (request.committedDueDate | date: 'EEE d MMM y') : 'Not set yet' }}
                </dd>
              </div>
            </dl>
          </section>
        } @else if (request.status === 'Rejected') {
          <section class="mt-6 rounded-card bg-over-50 p-6" aria-label="The team's answer">
            <p class="label-caps text-over-700">Reason</p>
            <p class="mt-1 text-sm text-over-700">{{ request.rejectionReason }}</p>
          </section>
        }

        <section class="panel mt-6 p-6" aria-label="Request">
          <div class="grid gap-6 sm:grid-cols-2">
            <div>
              <h2 class="label-caps">Main goal</h2>
              <p class="mt-1 text-sm whitespace-pre-line" [class.text-ink-muted]="!request.mainGoal">
                {{ request.mainGoal ?? 'No main goal given.' }}
              </p>
            </div>
            <div>
              <h2 class="label-caps">Deliverables</h2>
              <ul class="mt-1 list-disc space-y-1 pl-5 text-sm">
                @for (deliverable of request.deliverables; track $index) {
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
              <dd class="mt-1">{{ request.teamName }}</dd>
            </div>
            <div>
              <dt class="label-caps">{{ departmentLabel() }}</dt>
              <dd class="mt-1">{{ request.department }}</dd>
            </div>
            <div>
              <dt class="label-caps">Priority</dt>
              <dd class="mt-1">{{ request.priority }}</dd>
            </div>
            <div>
              <dt class="label-caps">Studio deadline</dt>
              <dd class="mt-1">{{ request.requestedDueDate ? (request.requestedDueDate | date: 'EEE d MMM y') : 'No date' }}</dd>
            </div>
            <div>
              <dt class="label-caps">Requested by</dt>
              <dd class="mt-1">{{ request.requesterName }}</dd>
            </div>
            <div>
              <dt class="label-caps">Briefed in</dt>
              <dd class="mt-1">
                {{ request.createdAt | date: 'EEE d MMM y, HH:mm' }}
                @if (request.loggedByName; as loggedBy) {
                  &middot; logged by {{ loggedBy }}
                }
              </dd>
            </div>
          </dl>
        </section>
      } @else {
        <p class="empty-state mt-6">Loading the request...</p>
      }
    </div>
  `,
})
export class RequestDetailPage {
  private readonly requests = inject(RequestsService);
  protected readonly departmentLabel = inject(AuthService).departmentLabel;

  /** From the `/requests/:id` route. */
  readonly id = input.required<string>();

  protected readonly request = resource({ params: () => this.id(), loader: ({ params }) => this.requests.get(params) });
  protected readonly note = computed(() => {
    const request = this.request.value();
    return request ? NOTE[request.status] : '';
  });
}
