import { Component, computed, input, output } from '@angular/core';
import { BoardColumn, Job, Person, Workflow } from '../../core/models';
import { JobCard, toCard } from '../board/job-card';

export interface JobGroup {
  column: BoardColumn;
  jobs: Job[];
}

/** The board columns that hold any of the jobs, in board order, each keeping the order given (overdue first). */
export function groupJobs(jobs: Job[], columns: BoardColumn[]): JobGroup[] {
  return columns
    .map((column) => ({ column, jobs: jobs.filter((j) => j.columnId === column.id) }))
    .filter((group) => group.jobs.length > 0);
}

/** The person's own open jobs as columns, one per board column they are in, in the board's card style. */
@Component({
  selector: 'app-my-jobs',
  imports: [JobCard],
  host: { class: 'block' },
  template: `
    <div class="flex items-baseline gap-3">
      <h2 class="font-display text-lg font-semibold">My {{ jobLabel().toLowerCase() }}s</h2>
      <span class="label-caps">{{ jobs().length }} open</span>
    </div>

    @if (groups().length) {
      <div class="mt-4 grid gap-6 lg:grid-cols-3">
        @for (group of groups(); track group.column.id) {
          <section class="panel flex flex-col" [attr.aria-label]="group.column.name">
            <div class="px-4 pt-4 pb-2">
              <div class="flex items-center gap-2">
                <span class="h-1.5 w-6 rounded-full bg-highlight"></span>
                <span class="label-caps">{{ group.jobs.length }} {{ group.jobs.length === 1 ? 'card' : 'cards' }}</span>
              </div>
              <h3 class="mt-2 text-base font-semibold">{{ group.column.name }}</h3>
            </div>
            <!-- Three cards fit; a longer list scrolls inside its column, fading at an edge with more to show, so the schedule stays in view. -->
            <div class="scroll-thin scroll-fade-y flex max-h-96 flex-col gap-3 overflow-y-auto px-4 pt-2 pb-4">
              @for (job of group.jobs; track job.id) {
                <app-job-card [card]="cards().get(job.id)!" [detail]="job.teamName" (opened)="opened.emit(job)" />
              }
            </div>
          </section>
        }
      </div>
    } @else {
      <p class="empty-state mt-4">No open {{ jobLabel().toLowerCase() }}s are yours yet.</p>
    }
  `,
})
export class MyJobs {
  readonly jobs = input.required<Job[]>();
  readonly workflow = input.required<Workflow>();
  readonly person = input.required<Person>();
  /** The org's word for a job, such as "Job" (D77). */
  readonly jobLabel = input('Job');
  readonly opened = output<Job>();

  protected readonly groups = computed(() => groupJobs(this.jobs(), this.workflow().columns));

  /** Each job as the board shows it, by job id. */
  protected readonly cards = computed(() => {
    const people = new Map([[this.person().id, this.person()]]);
    const scheduled = new Set(this.workflow().scheduledStatusIds);
    return new Map(this.jobs().map((j) => [j.id, toCard(j, people, scheduled)]));
  });
}
