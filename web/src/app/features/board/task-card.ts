import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { Person, Project, Task } from '../../core/models';
import { Avatar } from '../../shared/avatar';
import { Tooltip } from '../../shared/tooltip';
import { reviewRoundLabel } from './review-round';

/** A task with what the board needs to show it. */
export interface BoardCard {
  task: Task;
  project: Project;
  assignee: Person | null;
  canEdit: boolean;
}

@Component({
  selector: 'app-task-card',
  imports: [Avatar, DatePipe, Tooltip],
  template: `
    @let task = card().task;
    <button
      type="button"
      class="block w-full rounded-card border border-line bg-surface px-4 py-3 text-left shadow-soft transition-shadow hover:shadow-lifted focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
      [class.cursor-grab]="card().canEdit"
      (click)="opened.emit()"
    >
      <span class="flex items-center gap-2 text-xs text-ink-muted" [style.--hue]="card().project.colour">
        <span class="hue-dot size-2 shrink-0 rounded-full"></span>
        <span class="truncate">{{ card().project.name }}</span>
      </span>
      <span class="mt-2 block font-display text-sm font-semibold">{{ task.title }}</span>
      <span class="mt-3 flex h-6 items-center gap-2 text-xs">
        @if (task.dueDate) {
          <span
            class="flex items-center gap-1.5"
            [class]="task.isOverdue ? 'font-semibold text-over-700' : 'text-ink-muted'"
            [attr.title]="task.isOverdue ? 'Overdue' : 'Due date'"
          >
            @if (task.isOverdue) {
              <span class="size-1.5 rounded-full bg-over-500"></span>
            }
            {{ task.dueDate | date: 'd MMM' }}
          </span>
        }
        @if (task.reviewCycle > 1) {
          <span
            class="rounded-full bg-warn-50 px-2 py-0.5 font-semibold text-warn-700"
            [appTooltip]="reviewRoundLabel(task.reviewCycle)"
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

  protected readonly reviewRoundLabel = reviewRoundLabel;
}
