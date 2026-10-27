import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { Person, Project, Task } from '../../core/models';
import { Avatar } from '../../shared/avatar';

/** A task with what the board needs to show it. */
export interface BoardCard {
  task: Task;
  project: Project;
  assignee: Person | null;
  canEdit: boolean;
}

@Component({
  selector: 'app-task-card',
  imports: [Avatar, DatePipe],
  template: `
    @let task = card().task;
    <button
      type="button"
      class="block w-full rounded-md border border-l-4 border-slate-200 bg-white px-3 py-2.5 text-left shadow-xs hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-accent-500"
      [class.cursor-grab]="card().canEdit"
      [style.border-left-color]="card().project.colour"
      (click)="opened.emit()"
    >
      <span class="block truncate text-xs text-slate-500">{{ card().project.name }}</span>
      <span class="mt-0.5 block text-sm font-medium text-slate-900">{{ task.title }}</span>
      <span class="mt-2.5 flex h-6 items-center gap-2 text-xs">
        @if (task.dueDate) {
          <span
            [class]="task.isOverdue ? 'font-semibold text-red-600' : 'text-slate-500'"
            [attr.title]="task.isOverdue ? 'Overdue' : 'Due date'"
            >{{ task.dueDate | date: 'd MMM' }}</span
          >
        }
        @if (task.reviewCycle > 1) {
          <span
            class="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800"
            [attr.title]="'Review cycle ' + task.reviewCycle"
            >R{{ task.reviewCycle }}</span
          >
        }
        @if (card().assignee; as assignee) {
          <app-avatar class="ml-auto" size="sm" [name]="assignee.name" [colour]="assignee.avatarColour" />
        }
      </span>
    </button>
  `,
})
export class TaskCard {
  readonly card = input.required<BoardCard>();
  readonly opened = output<void>();
}
