import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { Task, WorkflowStatus } from '../../core/models';
import { BoardCard, TaskCard } from './task-card';

// Heroicons chevron-left and chevron-right (mini, MIT) path data.
const CHEVRON_LEFT =
  'M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z';
const CHEVRON_RIGHT =
  'M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z';

/**
 * One workflow status as a drop list of cards. Columns connect through the page's cdkDropListGroup.
 * Expanded, columns share the width equally (240px to 360px) and fill the height. Collapsed, a column is a
 * narrow strip with its name and card count that still accepts drops (the card goes to the top).
 */
@Component({
  selector: 'app-board-column',
  imports: [CdkDropList, CdkDrag, NgTemplateOutlet, TaskCard],
  host: { '[class]': 'hostClasses()' },
  template: `
    @if (collapsed()) {
      <div
        class="flex min-h-0 flex-1 flex-col items-center gap-3 rounded-card px-2 py-4 [&_.cdk-drag-placeholder]:hidden [&.cdk-drop-list-dragging]:bg-accent-50"
        cdkDropList
        [cdkDropListData]="status().id"
        (cdkDropListDropped)="dropped.emit($event)"
      >
        <ng-container *ngTemplateOutlet="toggle" />
        <span
          class="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-muted"
          [attr.title]="countLabel()"
          >{{ cards().length }}</span
        >
        <h2 class="text-base font-semibold [writing-mode:vertical-rl]">{{ status().name }}</h2>
      </div>
    } @else {
      <div class="px-4 pt-4 pb-2">
        <div class="flex items-center gap-2">
          <span class="h-1.5 w-6 rounded-full bg-highlight"></span>
          <span class="label-caps">{{ countLabel() }}</span>
          <span class="ml-auto"><ng-container *ngTemplateOutlet="toggle" /></span>
        </div>
        <h2 class="mt-2 text-base font-semibold">{{ status().name }}</h2>
      </div>
      <div
        class="scroll-quiet flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-2 pb-4"
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
          <p
            class="flex flex-1 items-center justify-center rounded-control border border-dashed border-line-strong text-sm text-ink-muted"
          >
            No cards
          </p>
        }
      </div>
    }

    <ng-template #toggle>
      <button
        type="button"
        class="flex rounded-control p-1 text-ink-faint hover:bg-surface-muted hover:text-ink focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
        [attr.aria-label]="(collapsed() ? 'Expand ' : 'Collapse ') + status().name"
        [attr.aria-expanded]="!collapsed()"
        (click)="toggled.emit()"
      >
        <svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" clip-rule="evenodd" [attr.d]="collapsed() ? chevronRight : chevronLeft" />
        </svg>
      </button>
    </ng-template>
  `,
})
export class BoardColumn {
  readonly status = input.required<WorkflowStatus>();
  readonly cards = input.required<BoardCard[]>();
  readonly collapsed = input(false);
  readonly dropped = output<CdkDragDrop<string, string, Task>>();
  readonly opened = output<Task>();
  readonly toggled = output<void>();

  protected readonly chevronLeft = CHEVRON_LEFT;
  protected readonly chevronRight = CHEVRON_RIGHT;

  protected readonly hostClasses = computed(
    () => `panel flex flex-col ${this.collapsed() ? 'w-14 shrink-0' : 'min-w-60 max-w-90 flex-1 basis-0'}`,
  );

  protected readonly countLabel = computed(() => `${this.cards().length} ${this.cards().length === 1 ? 'card' : 'cards'}`);
}
