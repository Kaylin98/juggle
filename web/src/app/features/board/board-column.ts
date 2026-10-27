import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, input, output } from '@angular/core';
import { Task, WorkflowStatus } from '../../core/models';
import { BoardCard, TaskCard } from './task-card';

/** One workflow status as a drop list of cards. Columns connect through the page's cdkDropListGroup. */
@Component({
  selector: 'app-board-column',
  imports: [CdkDropList, CdkDrag, TaskCard],
  host: { class: 'panel flex w-72 shrink-0 flex-col' },
  template: `
    <div class="px-4 pt-4 pb-2">
      <div class="flex items-center gap-2">
        <span class="h-1.5 w-6 rounded-full bg-highlight"></span>
        <span class="label-caps">{{ cards().length }} {{ cards().length === 1 ? 'card' : 'cards' }}</span>
      </div>
      <h2 class="mt-2 text-base font-semibold">{{ status().name }}</h2>
    </div>
    <div
      class="flex min-h-24 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-2 pb-4"
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
      } @empty {
        <p class="rounded-control border border-dashed border-line-strong py-6 text-center text-sm text-ink-muted in-[.cdk-drop-list-dragging]:hidden">
          No cards
        </p>
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
