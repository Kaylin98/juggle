import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FormField, disabled, form, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { Person, Task, UpdateTask } from '../../core/models';
import { TeamContextService } from '../../core/team-context.service';
import { startOfWeek } from '../../shared/dates';
import { Drawer } from '../../shared/drawer';
import { Select, SelectOption } from '../../shared/select';
import { ToastService } from '../../shared/toast.service';
import { Tooltip } from '../../shared/tooltip';
import { BoardService } from './board.service';
import { BookOnSchedule } from './book-on-schedule';
import { reviewRoundLabel } from './review-round';
import { BoardCard } from './task-card';

/** Form fields as the inputs hold them: empty strings for blank values. */
interface TaskForm {
  title: string;
  description: string;
  assigneePersonId: string;
  estimateHours: number | null;
  dueDate: string;
  link: string;
}

function toForm(task: Task): TaskForm {
  return {
    title: task.title,
    description: task.description ?? '',
    assigneePersonId: task.assigneePersonId ?? '',
    estimateHours: task.estimateHours,
    dueDate: task.dueDate ?? '',
    link: task.link ?? '',
  };
}

function toUpdate(value: TaskForm): UpdateTask {
  return {
    title: value.title.trim(),
    description: value.description.trim() || null,
    assigneePersonId: value.assigneePersonId || null,
    estimateHours: value.estimateHours,
    dueDate: value.dueDate || null,
    link: value.link.trim() || null,
  };
}

@Component({
  selector: 'app-task-drawer',
  imports: [BookOnSchedule, Drawer, FormField, RouterLink, Select, Tooltip],
  templateUrl: './task-drawer.html',
})
export class TaskDrawer {
  private readonly boardService = inject(BoardService);
  private readonly toast = inject(ToastService);
  protected readonly teamContext = inject(TeamContextService);

  readonly card = input.required<BoardCard>();
  readonly people = input.required<Person[]>();
  /** Only Team Admins change the assignee (D36); planned to become a per-team setting after the MVP. */
  readonly canReassign = input.required<boolean>();
  /** Team Admins book the assignee on the schedule from here, or view the task's bookings there (D28, D59). */
  readonly canBook = input.required<boolean>();
  readonly closed = output<void>();
  readonly saved = output<Task>();
  /** A booking was made from here, so the card's booked hours changed. */
  readonly booked = output<void>();

  protected readonly reviewRoundLabel = reviewRoundLabel;

  protected readonly assigneeOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Unassigned' },
    ...this.people().map((p) => ({ value: p.id, label: p.name, avatarColour: p.avatarColour })),
  ]);

  /** The saved assignee, who a booking is for. */
  protected readonly assignee = computed(() => this.people().find((p) => p.id === this.card().task.assigneePersonId) ?? null);

  /** The week of the first booking, where "View on schedule" opens the schedule (as the card's chip does). */
  protected readonly bookedWeek = computed(() => startOfWeek(this.card().task.bookings[0].startDate));

  /** Another booking is offered until the bookings cover the estimate; always when there is no estimate (D59). */
  protected readonly canAddBooking = computed(() => {
    const { estimateHours, bookedHours } = this.card().task;
    return this.assignee() !== null && (estimateHours === null || bookedHours < estimateHours);
  });

  /** The booking form is open. Closes when another task opens. */
  protected readonly booking = linkedSignal({ source: () => this.card().task.id, computation: () => false });

  protected readonly model = linkedSignal(() => toForm(this.card().task));

  protected readonly taskForm = form(this.model, (task) => {
    disabled(task, () => !this.card().canEdit);
    disabled(task.assigneePersonId, () => !this.canReassign());
    required(task.title, { message: 'Enter a title.' });
    maxLength(task.title, 200, { message: 'Keep the title under 200 characters.' });
    maxLength(task.description, 4000, { message: 'Keep the description under 4000 characters.' });
    min(task.estimateHours, 0, { message: 'The estimate cannot be negative.' });
    max(task.estimateHours, 999, { message: 'The estimate must be under 1000 hours.' });
    maxLength(task.link, 1000, { message: 'Keep the link under 1000 characters.' });
  });

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.taskForm, async () => {
      try {
        this.saved.emit(await this.boardService.updateTask(this.card().task.id, toUpdate(this.model())));
      } catch (error) {
        this.toast.error(error);
      }
      return undefined;
    });
  }
}
