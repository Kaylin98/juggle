import { DatePipe } from '@angular/common';
import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { RequestsService } from '../../core/requests.service';
import { StatusPill } from './status-pill';

/** The signed-in user's requests, newest first. Each row opens the request. */
@Component({
  selector: 'app-my-requests',
  imports: [DatePipe, RouterLink, StatusPill],
  template: `
    <div class="px-8 pt-2 pb-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="page-title">My requests</h1>
          <p class="mt-1 text-sm text-ink-muted">Work you have asked teams for, newest first.</p>
        </div>
        <a routerLink="/request" class="btn-primary inline-flex items-center">New request</a>
      </div>

      @if (requests.error()) {
        <p class="empty-state mt-6 text-over-700">Your requests could not be loaded. Refresh the page to try again.</p>
      } @else if (requests.hasValue()) {
        @if (requests.value().length) {
          <div class="panel mt-6 overflow-hidden">
            <div class="hidden grid-cols-[minmax(0,1fr)_8rem_7rem_7rem_7rem_7rem] gap-4 border-b border-line px-6 py-3 md:grid">
              <span class="label-caps">Request</span>
              <span class="label-caps">Team</span>
              <span class="label-caps">{{ departmentLabel() }}</span>
              <span class="label-caps">Briefed in</span>
              <span class="label-caps">Deadline</span>
              <span class="label-caps text-right">Status</span>
            </div>
            <ul>
              @for (request of requests.value(); track request.id) {
                <li class="border-b border-line last:border-b-0">
                  <a
                    [routerLink]="['/requests', request.id]"
                    class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-6 py-4 text-sm hover:bg-page focus-visible:bg-page focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none focus-visible:ring-inset md:grid-cols-[minmax(0,1fr)_8rem_7rem_7rem_7rem_7rem]"
                  >
                    <span class="truncate font-semibold">{{ request.title }}</span>
                    <span class="text-ink-muted max-md:col-start-1 max-md:row-start-2">
                      {{ request.teamName }}<span class="md:hidden"> &middot; {{ request.department }}</span>
                    </span>
                    <span class="truncate text-ink-muted max-md:hidden">{{ request.department }}</span>
                    <span class="text-ink-muted max-md:hidden">{{ request.createdAt | date: 'd MMM y' }}</span>
                    <span class="text-ink-muted max-md:hidden">
                      {{ request.requestedDueDate ? (request.requestedDueDate | date: 'd MMM y') : '-' }}
                    </span>
                    <span class="text-right max-md:col-start-2 max-md:row-span-2 max-md:row-start-1">
                      <app-status-pill [status]="request.status" />
                    </span>
                  </a>
                </li>
              }
            </ul>
          </div>
        } @else {
          <div class="empty-state mt-6">
            <p>You haven't asked a team for work yet.</p>
            <a routerLink="/request" class="btn-primary mt-4 inline-flex items-center">New request</a>
          </div>
        }
      } @else {
        <p class="empty-state mt-6">Loading your requests...</p>
      }
    </div>
  `,
})
export class MyRequestsPage {
  private readonly service = inject(RequestsService);
  protected readonly departmentLabel = inject(AuthService).departmentLabel;

  protected readonly requests = resource({ loader: () => this.service.mine() });
}
