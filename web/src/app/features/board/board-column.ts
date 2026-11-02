import { CDK_DRAG_CONFIG, CdkDrag, CdkDragEnd, CdkDropList } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { BoardColumn as Column, Job } from '../../core/models';
import { BoardCard, JobCard } from './job-card';

// Heroicons chevron-left and chevron-right (mini, MIT) path data.
const CHEVRON_LEFT =
  'M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z';
const CHEVRON_RIGHT =
  'M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z';

/**
 * One board column and its jobs (D64). A card can be dragged to another column, which the board turns into a workflow
 * action or refuses (D74). Expanded, columns share the width equally (240px to 360px) and fill the height. Collapsed, a column is a
 * narrow strip with its name and card count.
 */
@Component({
  selector: 'app-board-column',
  imports: [CdkDrag, CdkDropList, NgTemplateOutlet, JobCard],
  // A move under 3px is a click, not a drag.
  providers: [{ provide: CDK_DRAG_CONFIG, useValue: { dragStartThreshold: 3 } }],
  host: { '[class]': 'hostClasses()', '[attr.data-column-id]': 'column().id' },
  template: `
    @if (collapsed()) {
      <div class="flex min-h-0 flex-1 flex-col items-center gap-3 rounded-card px-2 py-4">
        <ng-container *ngTemplateOutlet="toggle" />
        <span
          class="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-muted"
          [attr.title]="countLabel()"
          >{{ cards().length }}</span
        >
        <h2 class="text-base font-semibold [writing-mode:vertical-rl]">{{ column().name }}</h2>
      </div>
    } @else {
      <div class="px-4 pt-4 pb-2">
        <div class="flex items-center gap-2">
          <span class="h-1.5 w-6 rounded-full bg-highlight"></span>
          <span class="label-caps">{{ countLabel() }}</span>
          <span class="ml-auto"><ng-container *ngTemplateOutlet="toggle" /></span>
        </div>
        <h2 class="mt-2 text-base font-semibold">{{ column().name }}</h2>
        @if (dropHint(); as hint) {
          <p class="mt-1 text-xs font-semibold text-accent-700">Drop to: {{ hint }}</p>
        }
      </div>
      <!--
        A drop list only so that the dragged card's preview is lifted out of this scroll area, which would otherwise
        clip it; cards never sort or move between lists, the board reads the drop point.
      -->
      <div
        cdkDropList
        [cdkDropListSortingDisabled]="true"
        [cdkDropListEnterPredicate]="never"
        class="scroll-quiet flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-2 pb-4"
      >
        @for (card of cards(); track card.job.id) {
          <app-job-card
            cdkDrag
            [cdkDragDisabled]="card.job.actions.length === 0"
            [card]="card"
            [showBooking]="true"
            [canDrag]="card.job.actions.length > 0"
            (opened)="open(card.job)"
            (cdkDragStarted)="dragStarted(card.job)"
            (cdkDragEnded)="dragEnded($event, card.job)"
          />
        } @empty {
          <p
            class="flex flex-1 items-center justify-center rounded-control border border-dashed border-line-strong text-sm text-ink-muted"
          >
            {{ filtered() ? 'No matching cards' : 'No cards' }}
          </p>
        }
      </div>
    }

    <ng-template #toggle>
      <button
        type="button"
        class="flex rounded-control p-1 text-ink-faint hover:bg-surface-muted hover:text-ink focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
        [attr.aria-label]="(collapsed() ? 'Expand ' : 'Collapse ') + column().name"
        [attr.aria-expanded]="!collapsed()"
        (click)="toggled.emit()"
      >
        <svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            [attr.d]="collapsed() ? chevronRight : chevronLeft"
          />
        </svg>
      </button>
    </ng-template>
  `,
})
export class BoardColumn {
  readonly column = input.required<Column>();
  readonly cards = input.required<BoardCard[]>();
  readonly collapsed = input(false);
  /** A board filter is on, so an empty column has no matching cards rather than none at all. */
  readonly filtered = input(false);
  /** Set while a card is dragged: what dropping it here does, or null when it does nothing. */
  readonly dropHint = input<string | null>(null);
  /** A card is dragged and cannot be dropped here, so the column dims. */
  readonly dimmed = input(false);
  readonly opened = output<Job>();
  readonly toggled = output<void>();
  /** A card was dragged and let go; the board finds the column under the pointer. */
  readonly dragged = output<{ job: Job; point: { x: number; y: number } }>();
  readonly dragStart = output<Job>();
  readonly dragStop = output<void>();

  /** A drag that ends over its own card would also click it; the click is ignored. */
  private wasDragged = false;

  protected readonly never = (): boolean => false;

  protected open(job: Job): void {
    if (!this.wasDragged) this.opened.emit(job);
  }

  protected dragStarted(job: Job): void {
    this.wasDragged = true;
    this.dragStart.emit(job);
  }

  protected dragEnded(event: CdkDragEnd, job: Job): void {
    event.source.reset();
    setTimeout(() => (this.wasDragged = false));
    this.dragStop.emit();
    this.dragged.emit({ job, point: event.dropPoint });
  }

  protected readonly chevronLeft = CHEVRON_LEFT;
  protected readonly chevronRight = CHEVRON_RIGHT;

  protected readonly hostClasses = computed(
    () =>
      `panel flex flex-col transition-opacity ${this.collapsed() ? 'w-14 shrink-0' : 'min-w-60 max-w-90 flex-1 basis-0'}${this.dropHint() ? ' ring-3 ring-accent-200' : ''}${this.dimmed() ? ' opacity-50' : ''}`,
  );

  protected readonly countLabel = computed(
    () => `${this.cards().length} ${this.cards().length === 1 ? 'card' : 'cards'}`,
  );
}
