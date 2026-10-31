import { Component, computed, inject, resource, signal } from '@angular/core';
import { today } from '../../shared/dates';
import { ToastService } from '../../shared/toast.service';
import { TaskDrawer } from '../board/task-drawer';
import { MySchedule } from './my-schedule';
import { MyTasks, toCard } from './my-tasks';
import { MyTimeOffPanel } from './my-time-off';
import { MyWorkService } from './my-work.service';

/**
 * My work: the signed-in person's tasks, schedule and leave across all their teams, so the team switcher is hidden.
 * Members land here (D26). A task opens in the board's drawer, without reassigning or booking, which stay on the board.
 */
@Component({
  selector: 'app-my-work-page',
  imports: [MySchedule, MyTasks, MyTimeOffPanel, TaskDrawer],
  template: `
    <div class="px-8 pt-2 pb-8">
      <h1 class="page-title">My work</h1>
      <p class="mt-1 text-sm text-ink-muted">Your tasks, bookings and time off across all your teams</p>

      @if (myWork.error()) {
        <p class="empty-state mt-6 text-over-700">Your work could not be loaded. Refresh the page to try again.</p>
      } @else if (myWork.hasValue()) {
        @let data = myWork.value();
        <app-my-tasks class="mt-6" [tasks]="data.tasks" (opened)="openTaskId.set($event.task.id)" />

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
      <app-task-drawer
        [card]="card"
        [people]="people()"
        [canReassign]="false"
        [canBook]="false"
        (closed)="openTaskId.set(null)"
        (saved)="onSaved()"
      />
    }
  `,
})
export class MyWorkPage {
  private readonly service = inject(MyWorkService);
  private readonly toast = inject(ToastService);

  protected readonly today = today();
  protected readonly myWork = resource({ loader: () => this.service.get() });

  protected readonly openTaskId = signal<string | null>(null);
  protected readonly openCard = computed(() => {
    const task = this.myWork.hasValue() ? this.myWork.value().tasks.find((t) => t.task.id === this.openTaskId()) : undefined;
    return task ? toCard(task) : null;
  });

  /** The drawer's assignee list: only the viewer, who cannot reassign from here. */
  protected readonly people = computed(() => (this.myWork.hasValue() ? [this.myWork.value().person] : []));

  /** A saved due date can change the order, so the list reloads. */
  protected onSaved(): void {
    this.openTaskId.set(null);
    this.toast.show('Task saved.');
    this.myWork.reload();
  }
}
