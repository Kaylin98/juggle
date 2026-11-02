import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { formatDate } from '@angular/common';
import { Component, LOCALE_ID, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormField, form, max, min, required, submit } from '@angular/forms/signals';
import { AllocationsService } from '../../core/allocations.service';
import { JobsService } from '../../core/jobs.service';
import { AllocationCheck, Job, Person } from '../../core/models';
import { ClashDialog } from '../../shared/clash-dialog';
import { clashMessage, lateText } from '../../shared/clash-message';
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
 * juggle several jobs; hours/day is the estimate over the days, to the nearest half hour. Another booking
 * spreads what is left of the estimate after the job's bookings (D59).
 */
export function defaults(job: Job): BookingForm {
  const estimate = Math.max(0, (job.estimateHours ?? 0) - job.bookedHours);
  const days = Math.max(1, Math.ceil(estimate / DEFAULT_HOURS_PER_DAY));
  const hoursPerDay = estimate > 0 ? Math.max(0.5, Math.round((estimate / days) * 2) / 2) : DEFAULT_HOURS_PER_DAY;
  return { startDate: nextWeekday(today()), days, hoursPerDay };
}

/** The confirmation opens above the button, or below it when there is no room. */
const CONFIRM_POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
];

/** What the booking runs into, waiting for Cancel or "Book anyway". */
interface Warning {
  check: AllocationCheck;
  late: string | null;
}

/** Books the job's designer on the schedule for the job (D28), asking first if it runs into anything. */
@Component({
  selector: 'app-book-on-schedule',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, ClashDialog, FormField],
  template: `
    <form class="rounded-control bg-surface-muted p-4" novalidate (submit)="check($event)">
      <p class="text-sm">Book <span class="font-semibold">{{ designer().name }}</span> on the schedule</p>
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
        <button
          #origin="cdkOverlayOrigin"
          cdkOverlayOrigin
          type="submit"
          class="btn-primary"
          [disabled]="bookingForm().submitting()"
        >
          Book
        </button>
      </div>

      @if (warning(); as pending) {
        <ng-template
          cdkConnectedOverlay
          [cdkConnectedOverlayOrigin]="origin"
          [cdkConnectedOverlayOpen]="true"
          [cdkConnectedOverlayPositions]="confirmPositions"
          [cdkConnectedOverlayHasBackdrop]="true"
          cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
          (overlayOutsideClick)="warning.set(null)"
          (overlayKeydown)="$event.key === 'Escape' && warning.set(null)"
        >
          <app-clash-dialog
            [personName]="designer().name"
            [clashDays]="pending.check.clashDays"
            [leaveDays]="pending.check.leaveDays"
            [lateText]="pending.late"
            (cancelled)="warning.set(null)"
            (confirmed)="book()"
          />
        </ng-template>
      }
    </form>
  `,
})
export class BookOnSchedule {
  private readonly allocations = inject(AllocationsService);
  private readonly jobs = inject(JobsService);
  private readonly toast = inject(ToastService);
  private readonly locale = inject(LOCALE_ID);

  readonly job = input.required<Job>();
  readonly designer = input.required<Person>();
  readonly closed = output<void>();

  protected readonly confirmPositions = CONFIRM_POSITIONS;

  protected readonly model = linkedSignal(() => defaults(this.job()));

  protected readonly warning = signal<Warning | null>(null);

  protected readonly bookingForm = form(this.model, (booking) => {
    required(booking.startDate, { message: 'Choose a start date.' });
    required(booking.days, { message: 'Enter the number of working days.' });
    min(booking.days, 1, { message: 'Book at least one day.' });
    max(booking.days, 260, { message: 'Book at most a year of working days.' });
    required(booking.hoursPerDay, { message: 'Enter the hours per day.' });
    min(booking.hoursPerDay, 0.5, { message: 'Book at least half an hour a day.' });
    max(booking.hoursPerDay, 24, { message: 'A day has 24 hours.' });
  });

  protected async check(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.bookingForm, async () => {
      const { startDate, days, hoursPerDay } = this.model();
      const endDate = addWeekdays(startDate, Math.round(days!) - 1);
      try {
        const check = await this.allocations.check({
          jobId: this.job().id,
          personId: this.designer().id,
          startDate,
          endDate,
          hoursPerDay: hoursPerDay!,
        });
        const late = lateText(check.deadline, endDate, check.workingDaysLate, this.locale);
        if (check.clashDays.length || check.leaveDays.length || late) {
          this.warning.set({ check, late });
        } else {
          await this.book();
        }
      } catch (error) {
        this.toast.error(error);
      }
      return undefined;
    });
  }

  protected async book(): Promise<void> {
    this.warning.set(null);
    const { startDate, days, hoursPerDay } = this.model();
    const endDate = addWeekdays(startDate, Math.round(days!) - 1);
    try {
      const saved = await this.allocations.create({
        personId: this.designer().id,
        jobId: this.job().id,
        startDate,
        endDate,
        hoursPerDay: hoursPerDay!,
        notes: null,
      });
      const clash = clashMessage(this.designer().name, saved.clashDays, saved.leaveDays, this.locale);
      const date = (d: string) => formatDate(d, 'EEE d MMM', this.locale);
      this.toast.show(
        clash ?? `Booked ${this.designer().name} for ${hoursPerDay}h/day, ${date(startDate)} to ${date(endDate)}.`,
        clash ? 'warning' : 'success',
      );
      this.jobs.notifyChanged();
      this.closed.emit();
    } catch (error) {
      this.toast.error(error);
    }
  }
}
