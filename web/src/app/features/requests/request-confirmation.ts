import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RequestStatus } from '../../core/models';
import { RequestsService } from '../../core/requests.service';

const STATUS: Record<RequestStatus, { label: string; pill: string; note: string }> = {
  New: { label: 'New', pill: 'bg-accent-50 text-accent-700', note: 'The team will triage it soon.' },
  Accepted: { label: 'Accepted', pill: 'bg-ok-50 text-ok-700', note: 'The team has taken it on.' },
  Rejected: { label: 'Rejected', pill: 'bg-over-50 text-over-700', note: 'The team could not take it on.' },
};

/** A submitted request and its status (D30). */
@Component({
  selector: 'app-request-confirmation',
  imports: [DatePipe, RouterLink],
  template: `
    <div class="px-8 pt-2 pb-8">
      @if (request.error()) {
        <h1 class="page-title">Request</h1>
        <p class="empty-state mt-6 text-over-700">This request could not be loaded.</p>
      } @else if (request.value(); as request) {
        <h1 class="page-title">{{ request.status === 'New' ? 'Request sent' : 'Request' }}</h1>
        <p class="mt-1 text-sm text-ink-muted">{{ status()!.note }}</p>

        <section class="panel mt-6 p-8">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="label-caps">{{ request.teamName }} team &middot; {{ request.type }}</p>
              <h2 class="mt-2 font-display text-xl font-semibold">{{ request.title }}</h2>
            </div>
            <span class="rounded-full px-3 py-1 text-xs font-semibold" [class]="status()!.pill">{{ status()!.label }}</span>
          </div>
          @if (request.description) {
            <p class="mt-4 text-sm whitespace-pre-line text-ink-muted">{{ request.description }}</p>
          }
          <dl class="mt-6 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt class="label-caps">Needed by</dt>
              <dd class="mt-1">{{ request.requestedDueDate ? (request.requestedDueDate | date: 'EEE d MMM y') : 'No date' }}</dd>
            </div>
            <div>
              <dt class="label-caps">Priority</dt>
              <dd class="mt-1">{{ request.priority }}</dd>
            </div>
            <div>
              <dt class="label-caps">Sent</dt>
              <dd class="mt-1">{{ request.createdAt | date: 'EEE d MMM, HH:mm' }}</dd>
            </div>
          </dl>
          @if (request.rejectionReason) {
            <p class="mt-6 rounded-control bg-over-50 px-4 py-3 text-sm text-over-700">{{ request.rejectionReason }}</p>
          }
        </section>

        <a routerLink="/request" class="btn-secondary mt-6 inline-flex items-center">Send another request</a>
      } @else {
        <p class="empty-state mt-6">Loading the request...</p>
      }
    </div>
  `,
})
export class RequestConfirmationPage {
  private readonly requests = inject(RequestsService);

  /** From the `/requests/:id` route. */
  readonly id = input.required<string>();

  protected readonly request = resource({ params: () => this.id(), loader: ({ params }) => this.requests.get(params) });
  protected readonly status = computed(() => {
    const request = this.request.value();
    return request ? STATUS[request.status] : null;
  });
}
