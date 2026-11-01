import { DatePipe } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Person, Project, Task } from '../../core/models';
import { TeamContextService } from '../../core/team-context.service';
import { Avatar } from '../../shared/avatar';
import { formatDateRange, startOfWeek } from '../../shared/dates';
import { Tooltip } from '../../shared/tooltip';
import { reviewRoundLabel } from './review-round';

/** A task with what the board needs to show it. */
export interface BoardCard {
  task: Task;
  project: Project;
  assignee: Person | null;
  canEdit: boolean;
  /** In a Done-category column, so it shows no booking chip. */
  done: boolean;
  /** Awaiting approval from the viewer, its brand's manager, who can approve it or ask for changes (D58). */
  approvable: boolean;
}

/**
 * A board card. The whole card is one button that opens the task; it lies under the content, which lets clicks
 * through except on the parts with their own hint, link or button (due date, review round, booking chip, approval),
 * since a link or button cannot sit inside a button.
 */
@Component({
  selector: 'app-task-card',
  imports: [Avatar, DatePipe, RouterLink, Tooltip],
  template: `
    @let task = card().task;
    <div class="relative rounded-card bg-surface shadow-soft transition-shadow hover:shadow-lifted">
      <button
        type="button"
        class="absolute inset-0 rounded-card focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
        [class.cursor-grab]="card().canEdit && movable()"
        (click)="opened.emit()"
      >
        <span class="sr-only">{{ task.title }}, {{ card().project.name }}</span>
      </button>
      <div class="pointer-events-none relative px-4 py-3">
        <span class="flex items-center gap-2 text-xs text-ink-muted" [style.--hue]="card().project.colour">
          <span class="hue-dot size-2 shrink-0 rounded-full"></span>
          <span class="truncate">{{ card().project.name }}</span>
        </span>
        <span class="mt-2 block font-display text-sm font-semibold">{{ task.title }}</span>
        <span class="mt-3 flex h-6 items-center gap-2 text-xs">
          @if (task.dueDate) {
            <span
              class="pointer-events-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap"
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
              class="pointer-events-auto rounded-full bg-warn-50 px-2 py-0.5 font-semibold text-warn-700"
              [appTooltip]="reviewRoundLabel(task.reviewCycle)"
              >R{{ task.reviewCycle }}</span
            >
          }
          @if (showBooking() && !card().done) {
            @if (task.bookings.length > 0) {
              <a
                class="pointer-events-auto rounded-full bg-ok-50 px-2 py-0.5 font-semibold whitespace-nowrap text-ok-700 hover:underline focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
                [routerLink]="['/t', teamContext.teamId(), 'capacity']"
                [queryParams]="{ week: bookedWeek() }"
                [appTooltip]="bookingsLabel()"
                [attr.aria-label]="'Booked ' + task.bookedHours + 'h. Open the schedule at this booking'"
                >Booked {{ task.bookedHours }}h</a
              >
            } @else if (task.isDueSoon) {
              <span
                class="pointer-events-auto rounded-full bg-warn-50 px-2 py-0.5 font-semibold whitespace-nowrap text-warn-700"
                appTooltip="Due within 7 days and not booked"
                >Not booked</span
              >
            } @else {
              <span class="rounded-full bg-surface-muted px-2 py-0.5 whitespace-nowrap text-ink-muted">Not booked</span>
            }
          }
          @if (detail()) {
            <span class="ml-auto truncate text-ink-muted">{{ detail() }}</span>
          } @else if (card().assignee; as assignee) {
            <app-avatar class="ml-auto" size="sm" [name]="assignee.name" [colour]="assignee.avatarColour" />
          }
        </span>
        @if (card().approvable) {
          <span class="mt-3 flex gap-2">
            <button type="button" class="btn-primary pointer-events-auto h-8 px-3 text-xs" (click)="approved.emit()">
              Approve
            </button>
            <button
              type="button"
              class="btn-secondary pointer-events-auto h-8 flex-1 px-2 text-xs whitespace-nowrap"
              (click)="changesRequested.emit()"
            >
              Request changes
            </button>
          </span>
        }
      </div>
    </div>
  `,
})
export class TaskCard {
  private readonly locale = inject(LOCALE_ID);
  protected readonly teamContext = inject(TeamContextService);

  readonly card = input.required<BoardCard>();
  /** On the board a card the viewer can edit is dragged between columns; elsewhere it only opens. */
  readonly movable = input(true);
  /** Shown in place of the assignee, such as the team and status on My work. */
  readonly detail = input<string | null>(null);
  /** The booking chip (D57), shown on the board. */
  readonly showBooking = input(false);
  readonly opened = output<void>();
  readonly approved = output<void>();
  readonly changesRequested = output<void>();

  protected readonly reviewRoundLabel = reviewRoundLabel;

  /** The week of the first booking, where the chip opens the schedule. */
  protected readonly bookedWeek = computed(() => startOfWeek(this.card().task.bookings[0].startDate));

  /** One line per booking: who, when and how many hours. */
  protected readonly bookingsLabel = computed(() =>
    this.card()
      .task.bookings.map((b) => `${b.personName} · ${formatDateRange(b.startDate, b.endDate, this.locale)} · ${b.hours}h`)
      .join('\n'),
  );
}
