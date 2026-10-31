import { Component, computed, input, output } from '@angular/core';
import { MyTask, StatusCategory } from '../../core/models';
import { BoardCard, TaskCard } from '../board/task-card';

export interface TaskGroup {
  category: StatusCategory;
  label: string;
  tasks: MyTask[];
}

const GROUPS: { category: StatusCategory; label: string }[] = [
  { category: 'Todo', label: 'To do' },
  { category: 'InProgress', label: 'In progress' },
  { category: 'Review', label: 'Review' },
];

/** Open tasks by status category, each group keeping the API's order: overdue first, then by due date. */
export function groupTasks(tasks: MyTask[]): TaskGroup[] {
  return GROUPS.map((group) => ({ ...group, tasks: tasks.filter((t) => t.category === group.category) }));
}

/** The person's own tasks as columns, one per status category, in the board's card style. A card opens the task. */
@Component({
  selector: 'app-my-tasks',
  imports: [TaskCard],
  host: { class: 'block' },
  template: `
    <div class="flex items-baseline gap-3">
      <h2 class="font-display text-lg font-semibold">My tasks</h2>
      <span class="label-caps">{{ countLabel() }}</span>
    </div>

    @if (tasks().length) {
      <div class="mt-4 grid gap-6 lg:grid-cols-3">
        @for (group of groups(); track group.category) {
          <section class="panel flex flex-col" [attr.aria-label]="group.label">
            <div class="px-4 pt-4 pb-2">
              <div class="flex items-center gap-2">
                <span class="h-1.5 w-6 rounded-full bg-highlight"></span>
                <span class="label-caps">{{ group.tasks.length }} {{ group.tasks.length === 1 ? 'task' : 'tasks' }}</span>
              </div>
              <h3 class="mt-2 text-base font-semibold">{{ group.label }}</h3>
            </div>
            <!-- Three cards fit; a longer list scrolls inside its column, the next card peeking in, so the schedule stays in view. -->
            <div class="scroll-thin flex max-h-104 flex-col gap-3 overflow-y-auto px-4 pt-2 pb-4">
              @for (task of group.tasks; track task.task.id) {
                <app-task-card [card]="cards().get(task.task.id)!" [movable]="false" [detail]="task.teamName + ' · ' + task.statusName" (opened)="opened.emit(task)" />
              } @empty {
                <p class="py-2 text-sm text-ink-muted">Nothing here.</p>
              }
            </div>
          </section>
        }
      </div>
    } @else {
      <p class="empty-state mt-4">No open tasks are assigned to you.</p>
    }
  `,
})
export class MyTasks {
  readonly tasks = input.required<MyTask[]>();
  readonly opened = output<MyTask>();

  protected readonly groups = computed(() => groupTasks(this.tasks()));
  protected readonly countLabel = computed(() => `${this.tasks().length} open`);

  /** Each task as the board shows it, by task id. They are the viewer's own tasks, so they can edit them all. */
  protected readonly cards = computed(() => new Map(this.tasks().map((t) => [t.task.id, toCard(t)])));
}

export function toCard(task: MyTask): BoardCard {
  const project = { id: task.task.projectId, name: task.projectName, colour: task.projectColour, department: task.projectDepartment };
  return { task: task.task, project, assignee: null, canEdit: true };
}
