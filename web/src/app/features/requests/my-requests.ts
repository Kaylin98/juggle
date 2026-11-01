import { DatePipe } from '@angular/common';
import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { StatusChip } from '../../shared/status-chip';

/** The jobs the signed-in user sent the brief for, newest first, each with its job ID and status. Each row opens the job. */
@Component({
  selector: 'app-my-requests',
  imports: [DatePipe, RouterLink, StatusChip],
  template: `
    <div class="px-8 pt-2 pb-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="page-title">My requests</h1>
          <p class="mt-1 text-sm text-ink-muted">The {{ terms().brief.toLowerCase() }}s you have sent, newest first.</p>
        </div>
        <a routerLink="/request" class="btn-primary inline-flex items-center">New {{ terms().brief.toLowerCase() }}</a>
      </div>

      @if (jobs.error()) {
        <p class="empty-state mt-6 text-over-700">Your {{ terms().brief.toLowerCase() }}s could not be loaded. Refresh the page to try again.</p>
      } @else if (jobs.hasValue()) {
        @if (jobs.value().length) {
          <div class="panel mt-6 overflow-hidden">
            <div class="hidden grid-cols-[minmax(0,1fr)_8rem_7rem_7rem_7rem_13rem] gap-4 border-b border-line px-6 py-3 md:grid">
              <span class="label-caps">{{ terms().job }}</span>
              <span class="label-caps">Team</span>
              <span class="label-caps">{{ departmentLabel() }}</span>
              <span class="label-caps">Briefed in</span>
              <span class="label-caps">Deadline</span>
              <span class="label-caps text-right">Status</span>
            </div>
            <ul>
              @for (job of jobs.value(); track job.id) {
                <li class="border-b border-line last:border-b-0">
                  <a
                    [routerLink]="['/requests', job.id]"
                    class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-6 py-4 text-sm hover:bg-page focus-visible:bg-page focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none focus-visible:ring-inset md:grid-cols-[minmax(0,1fr)_8rem_7rem_7rem_7rem_13rem]"
                  >
                    <span class="min-w-0">
                      <span class="block truncate font-semibold">{{ job.title }}</span>
                      <span class="block truncate text-xs text-ink-muted">{{ job.code }}</span>
                    </span>
                    <span class="text-ink-muted max-md:col-start-1 max-md:row-start-2">
                      {{ job.teamName }}<span class="md:hidden"> &middot; {{ job.department }}</span>
                    </span>
                    <span class="truncate text-ink-muted max-md:hidden">{{ job.department }}</span>
                    <span class="text-ink-muted max-md:hidden">{{ job.createdAt | date: 'd MMM y' }}</span>
                    <span class="text-ink-muted max-md:hidden">
                      {{ job.requiredDate ? (job.requiredDate | date: 'd MMM y') : '-' }}
                    </span>
                    <span class="text-right max-md:col-start-2 max-md:row-span-2 max-md:row-start-1">
                      <app-status-chip [name]="job.statusName" [colour]="job.statusColour" />
                    </span>
                  </a>
                </li>
              }
            </ul>
          </div>
        } @else {
          <div class="empty-state mt-6">
            <p>You haven't sent a {{ terms().brief.toLowerCase() }} yet.</p>
            <a routerLink="/request" class="btn-primary mt-4 inline-flex items-center">New {{ terms().brief.toLowerCase() }}</a>
          </div>
        }
      } @else {
        <p class="empty-state mt-6">Loading your {{ terms().brief.toLowerCase() }}s...</p>
      }
    </div>
  `,
})
export class MyRequestsPage {
  private readonly service = inject(JobsService);
  private readonly auth = inject(AuthService);
  protected readonly departmentLabel = this.auth.departmentLabel;
  /** The organisation's word for a request for work, such as "Brief" (D77). */
  protected readonly terms = this.auth.terms;

  protected readonly jobs = resource({ loader: () => this.service.mine() });
}
