import { Component, computed, inject, resource, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { today } from '../../shared/dates';
import { toCard } from '../board/job-card';
import { JobDrawer } from '../board/job-drawer';
import { MyJobs } from './my-jobs';
import { MySchedule } from './my-schedule';
import { MyTimeOffPanel } from './my-time-off';
import { MyWorkService } from './my-work.service';

/**
 * My work: the signed-in person's jobs, schedule and leave across all their teams, so the team switcher is hidden.
 * Designers land here (D26). A job opens in the board's drawer, without booking, which stays with the Traffic Manager.
 */
@Component({
  selector: 'app-my-work-page',
  imports: [JobDrawer, MyJobs, MySchedule, MyTimeOffPanel],
  template: `
    <div class="px-8 pt-2 pb-8">
      <h1 class="page-title">My work</h1>
      <p class="mt-1 text-sm text-ink-muted">Your {{ auth.terms().job.toLowerCase() }}s, bookings and time off across all your teams</p>

      @if (myWork.error() || workflow.error()) {
        <p class="empty-state mt-6 text-over-700">Your work could not be loaded. Refresh the page to try again.</p>
      } @else if (myWork.hasValue() && workflow.hasValue()) {
        @let data = myWork.value();
        <app-my-jobs
          class="mt-6"
          [jobs]="data.jobs"
          [workflow]="workflow.value()"
          [person]="data.person"
          [jobLabel]="auth.terms().job"
          (opened)="openJobId.set($event.id)"
        />

        <app-my-schedule
          class="mt-8"
          [days]="data.days"
          [bookings]="data.bookings"
          [hoursPerDay]="data.person.hoursPerDay"
          [today]="today"
        />
        <app-my-time-off class="mt-8" [timeOff]="data.timeOff" (changed)="myWork.reload()" />
      } @else {
        <p class="empty-state mt-6">Loading your work...</p>
      }
    </div>

    @if (openCard(); as card) {
      <app-job-drawer [card]="card" (closed)="openJobId.set(null)" />
    }
  `,
})
export class MyWorkPage {
  private readonly service = inject(MyWorkService);
  private readonly jobs = inject(JobsService);
  protected readonly auth = inject(AuthService);

  protected readonly today = today();
  protected readonly myWork = resource({ loader: () => this.service.get() });
  protected readonly workflow = resource({ loader: () => this.jobs.workflow() });

  protected readonly openJobId = signal<string | null>(null);
  protected readonly openCard = computed(() => {
    if (!this.myWork.hasValue() || !this.workflow.hasValue()) return null;
    const { jobs, person } = this.myWork.value();
    const job = jobs.find((j) => j.id === this.openJobId());
    return job ? toCard(job, new Map([[person.id, person]]), new Set(this.workflow.value().scheduledStatusIds)) : null;
  });
}
