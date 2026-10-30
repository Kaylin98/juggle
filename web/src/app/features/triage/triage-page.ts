import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Priority, WorkRequest } from '../../core/models';
import { RequestsService } from '../../core/requests.service';
import { TeamContextService } from '../../core/team-context.service';
import { Drawer } from '../../shared/drawer';
import { AcceptDialog } from './accept-dialog';
import { RejectDialog } from './reject-dialog';

const PRIORITY_PILL: Record<Priority, string> = {
  Urgent: 'bg-over-50 text-over-700',
  High: 'bg-warn-50 text-warn-700',
  Medium: 'bg-surface-muted text-ink-muted',
  Low: 'bg-surface-muted text-ink-muted',
};

/** The team's New requests, newest first (Team Admins). Accept turns one into a task; reject records why. */
@Component({
  selector: 'app-triage-page',
  imports: [AcceptDialog, DatePipe, Drawer, RejectDialog],
  template: `
    <div class="px-8 pt-2 pb-8">
      <h1 class="page-title">Triage</h1>
      <p class="mt-1 text-sm text-ink-muted">
        {{ teamContext.team()?.name }} team
        @if (inbox.hasValue()) {
          &middot; {{ inbox.value().length }} new {{ inbox.value().length === 1 ? 'request' : 'requests' }}
        }
      </p>

      @if (inbox.error()) {
        <p class="empty-state mt-6 text-over-700">The inbox could not be loaded. Refresh the page to try again.</p>
      } @else if (inbox.hasValue()) {
        <ul class="mt-6 space-y-4">
          @for (request of inbox.value(); track request.id) {
            <li class="panel flex flex-wrap items-start gap-6 p-6">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="label-caps">{{ request.type }}</span>
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" [class]="priorityPill[request.priority]">
                    {{ request.priority }}
                  </span>
                </div>
                <h2 class="mt-2 font-display text-base font-semibold">{{ request.title }}</h2>
                <p class="mt-1 text-sm text-ink-muted">
                  From {{ request.requesterName }}, {{ request.department }} &middot; sent {{ request.createdAt | date: 'EEE d MMM, HH:mm' }}
                  @if (request.requestedDueDate; as due) {
                    &middot; needed by <span class="font-semibold text-ink">{{ due | date: 'EEE d MMM' }}</span>
                  }
                </p>
                @if (request.description) {
                  <p class="mt-3 line-clamp-2 text-sm">{{ request.description }}</p>
                }
              </div>
              <div class="flex shrink-0 gap-2">
                <button type="button" class="btn-secondary" (click)="open.set({ request, action: 'reject' })">Reject</button>
                <button type="button" class="btn-primary" (click)="open.set({ request, action: 'accept' })">Accept</button>
              </div>
            </li>
          } @empty {
            <li class="empty-state">Nothing waiting. New requests for this team show up here.</li>
          }
        </ul>
      } @else {
        <p class="empty-state mt-6">Loading the inbox...</p>
      }
    </div>

    @if (open(); as current) {
      <app-drawer [heading]="current.action === 'accept' ? 'Accept request' : 'Reject request'" (closed)="open.set(null)">
        @if (current.action === 'accept') {
          <app-accept-dialog [request]="current.request" (done)="triaged()" (closed)="open.set(null)" />
        } @else {
          <app-reject-dialog [request]="current.request" (done)="triaged()" (closed)="open.set(null)" />
        }
      </app-drawer>
    }
  `,
})
export class TriagePage {
  private readonly requests = inject(RequestsService);
  protected readonly teamContext = inject(TeamContextService);

  /** Shared with the nav badge, so both refresh together. */
  protected readonly inbox = this.requests.inbox;
  protected readonly priorityPill = PRIORITY_PILL;

  /** The request being accepted or rejected in the drawer. */
  protected readonly open = signal<{ request: WorkRequest; action: 'accept' | 'reject' } | null>(null);

  protected triaged(): void {
    this.open.set(null);
    this.inbox.reload();
  }
}
