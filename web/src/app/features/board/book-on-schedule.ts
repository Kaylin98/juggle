import { formatDate } from '@angular/common';
import { Component, LOCALE_ID, inject, input, linkedSignal, output } from '@angular/core';
import { FormField, form, max, min, required, submit } from '@angular/forms/signals';
import { AllocationsService } from '../../core/allocations.service';
import { Person, Task } from '../../core/models';
import { clashMessage } from '../../shared/clash-message';
import { addWeekdays, nextWeekday, today } from '../../shared/dates';
import { ToastService } from '../../shared/toast.service';

interface BookingForm {
  startDate: string;
  days: number | null;
  hoursPerDay: number | null;
}

/** Without an estimate, book one day at this many hours. */
const DEFAULT_HOURS_PER_DAY = 4;

/**
 * Defaults (D28): start on the next working day; spread the estimate at about half a day a day, since people
 * juggle several projects; hours/day is the estimate over the days, to the nearest half hour. Another booking
 * spreads what is left of the estimate after the task's bookings (D59).
 */
export function defaults(task: Task): BookingForm {
  const estimate = Math.max(0, (task.estimateHours ?? 0) - task.bookedHours);
  const days = Math.max(1, Math.ceil(estimate / DEFAULT_HOURS_PER_DAY));
  const hoursPerDay = estimate > 0 ? Math.max(0.5, Math.round((estimate / days) * 2) / 2) : DEFAULT_HOURS_PER_DAY;
  return { startDate: nextWeekday(today()), days, hoursPerDay };
}

/** Books the task's assignee on the schedule for the task's project, linked to the task (D28). */
@Component({
  selector: 'app-book-on-schedule',
  imports: [FormField],
  template: `
    <form class="rounded-control bg-surface-muted p-4" novalidate (submit)="book($event)">
      <p class="text-sm">Book <span class="font-semibold">{{ assignee().name }}</span> on the schedule</p>
      <div class="mt-4 grid grid-cols-2 gap-4">
        <div class="col-span-2">
          <label class="form-label" for="book-start">Start</label>
          <input id="book-start" class="form-input" type="date" [formField]="bookingForm.startDate" />
        </div>
        <div>
          <label class="form-label" for="book-days">Working days</label>
          <input id="book-days" class="form-input" type="number" step="1" [formField]="bookingForm.days" />
        </div>
        <div>
          <label class="form-label" for="book-hours">Hours/day</label>
          <input id="book-hours" class="form-input" type="number" step="0.5" [formField]="bookingForm.hoursPerDay" />
        </div>
      </div>
      @for (field of [bookingForm.startDate, bookingForm.days, bookingForm.hoursPerDay]; track $index) {
        @if (field().touched() && field().invalid()) {
          <p class="field-error">{{ field().errors()[0].message }}</p>
        }
      }
      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="closed.emit()">Cancel</button>
        <button type="submit" class="btn-primary" [disabled]="bookingForm().submitting()">Book</button>
      </div>
    </form>
  `,
})
export class BookOnSchedule {
  private readonly allocations = inject(AllocationsService);
  private readonly toast = inject(ToastService);
  private readonly locale = inject(LOCALE_ID);

  readonly task = input.required<Task>();
  readonly assignee = input.required<Person>();
  readonly closed = output<void>();
  readonly booked = output<void>();

  protected readonly model = linkedSignal(() => defaults(this.task()));

  protected readonly bookingForm = form(this.model, (booking) => {
    required(booking.startDate, { message: 'Choose a start date.' });
    required(booking.days, { message: 'Enter the number of working days.' });
    min(booking.days, 1, { message: 'Book at least one day.' });
    max(booking.days, 260, { message: 'Book at most a year of working days.' });
    required(booking.hoursPerDay, { message: 'Enter the hours per day.' });
    min(booking.hoursPerDay, 0.5, { message: 'Book at least half an hour a day.' });
    max(booking.hoursPerDay, 24, { message: 'A day has 24 hours.' });
  });

  protected async book(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.bookingForm, async () => {
      const { startDate, days, hoursPerDay } = this.model();
      const endDate = addWeekdays(startDate, Math.round(days!) - 1);
      try {
        const saved = await this.allocations.create({
          personId: this.assignee().id,
          projectId: this.task().projectId,
          taskId: this.task().id,
          startDate,
          endDate,
          hoursPerDay: hoursPerDay!,
          notes: null,
        });
        const clash = clashMessage(this.assignee().name, saved.clashDays, saved.leaveDays, this.locale);
        const date = (d: string) => formatDate(d, 'EEE d MMM', this.locale);
        this.toast.show(
          clash ?? `Booked ${this.assignee().name} for ${hoursPerDay}h/day, ${date(startDate)} to ${date(endDate)}.`,
          clash ? 'warning' : 'success',
        );
        this.booked.emit();
        this.closed.emit();
      } catch (error) {
        this.toast.error(error);
      }
      return undefined;
    });
  }
}
