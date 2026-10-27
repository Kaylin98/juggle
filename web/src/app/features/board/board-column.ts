import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, input, output } from '@angular/core';
import { Task, WorkflowStatus } from '../../core/models';
import { BoardCard, TaskCard } from './task-card';

/** One workflow status as a drop list of cards. Columns connect through the page's cdkDropListGroup. */
@Component({
  selector: 'app-board-column',
  imports: [CdkDropList, CdkDrag, TaskCard],
  host: { class: 'flex w-72 shrink-0 flex-col rounded-lg bg-slate-100' },
  template: `
    <h2 class="flex items-center justify-between px-3 pt-3 pb-2 text-sm font-semibold text-slate-700">
      {{ status().name }}
      <span class="rounded-full bg-slate-200 px-2 text-xs font-medium text-slate-600">{{ cards().length }}</span>
    </h2>
    <div
      class="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3"
      cdkDropList
      [cdkDropListData]="status().id"
      (cdkDropListDropped)="dropped.emit($event)"
    >
      @for (card of cards(); track card.task.id) {
        <app-task-card
          cdkDrag
          [cdkDragData]="card.task"
          [cdkDragDisabled]="!card.canEdit"
          [card]="card"
          (opened)="opened.emit(card.task)"
        />
      }
    </div>
  `,
})
export class BoardColumn {
  readonly status = input.required<WorkflowStatus>();
  readonly cards = input.required<BoardCard[]>();
  readonly dropped = output<CdkDragDrop<string, string, Task>>();
  readonly opened = output<Task>();
}
