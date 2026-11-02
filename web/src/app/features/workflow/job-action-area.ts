import { Component, computed, input } from '@angular/core';
import { Job, Person, WorkflowAction } from '../../core/models';
import { ArtworkReview } from './artwork-review';
import { JobActions } from './job-actions';

/**
 * The actions the user may take on a job. When they are asked to approve its artwork, the artwork comes with them, so
 * nobody approves what they cannot see.
 */
@Component({
  selector: 'app-job-action-area',
  imports: [ArtworkReview, JobActions],
  host: { class: 'block has-[app-job-actions:empty]:hidden' },
  template: `
    @if (reviewing()) {
      <app-artwork-review [job]="job()" [people]="people()" [startWith]="startWith()" />
    } @else {
      <app-job-actions
        class="block empty:hidden"
        [job]="job()"
        [people]="people()"
        [startWith]="startWith()"
        [omit]="omit()"
      />
    }
  `,
})
export class JobActionArea {
  readonly job = input.required<Job>();
  readonly people = input<Person[]>([]);
  readonly startWith = input<WorkflowAction | null>(null);
  /** Actions shown elsewhere on the page. */
  readonly omit = input<WorkflowAction[]>([]);

  protected readonly reviewing = computed(
    () => this.job().actions.includes('ApproveDesign') || this.job().actions.includes('ApproveMarketing'),
  );
}
