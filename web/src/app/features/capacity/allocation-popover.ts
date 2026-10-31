import { CdkTrapFocus } from '@angular/cdk/a11y';
import { formatDate } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FormField, form, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { Allocation, Project } from '../../core/models';
import { segmentClass } from '../../shared/segment';
import { Select, SelectOption } from '../../shared/select';
import { Tooltip } from '../../shared/tooltip';
import { TimeOffForm } from '../time-off/time-off-form';

/** A booking being made or changed: who, which days, and the booking itself when it exists. */
export interface BookingDraft {
  allocation: Allocation | null;
  personId: string;
  personName: string;
  startDate: string;
  endDate: string;
}

export interface BookingDetails {
  projectId: string;
  hoursPerDay: number;
  notes: string | null;
}

interface BookingForm {
  projectId: string;
  hoursPerDay: number | null;
  notes: string;
}

type Tab = 'booking' | 'timeOff';

const DEFAULT_HOURS_PER_DAY = 4;

/**
 * Days picked on the grid open this. The Booking tab takes project and hours/day for a new booking (Team Admins);
 * the Time off tab asks for time off on the viewer's own row (D47). An existing booking shows hours/day and notes,
 * and can be deleted (D29).
 */
@Component({
  selector: 'app-allocation-popover',
  imports: [CdkTrapFocus, FormField, Select, TimeOffForm, Tooltip],
  template: `
    <div
      class="w-80 rounded-card bg-surface p-6 shadow-raised"
      role="dialog"
      [attr.aria-label]="heading()"
      cdkTrapFocus
      [cdkTrapFocusAutoCapture]="true"
    >
      <h2 class="font-display text-base font-semibold">{{ heading() }}</h2>
      <p class="mt-1 text-sm text-ink-muted">{{ draft().personName }} &middot; {{ dates() }}</p>

      @if (!draft().allocation) {
        <div class="mt-4 flex rounded-full border border-line bg-surface p-1" role="tablist" aria-label="What to add">
          <span class="flex flex-1" [appTooltip]="canBook() ? '' : 'Only team admins book work'">
            <button
              type="button"
              role="tab"
              [class]="tabClass('booking')"
              [attr.aria-selected]="tab() === 'booking'"
              [disabled]="!canBook()"
              (click)="tab.set('booking')"
            >
              Booking
            </button>
          </span>
          <span class="flex flex-1" [appTooltip]="isOwnRow() ? '' : 'You can only ask for time off for yourself'">
            <button
              type="button"
              role="tab"
              [class]="tabClass('timeOff')"
              [attr.aria-selected]="tab() === 'timeOff'"
              [disabled]="!isOwnRow()"
              (click)="tab.set('timeOff')"
            >
              Time off
            </button>
          </span>
        </div>
      }

      @if (tab() === 'timeOff') {
        <app-time-off-form
          class="mt-6"
          [startDate]="draft().startDate"
          [endDate]="draft().endDate"
          [showDates]="false"
          (requested)="timeOffRequested.emit()"
          (cancelled)="closed.emit()"
        />
      } @else {
        <form novalidate (submit)="save($event)">
          <div class="mt-6 space-y-4">
            <div>
              <label class="form-label" for="booking-project">Project</label>
              <app-select triggerId="booking-project" [options]="projectOptions()" [formField]="bookingForm.projectId" />
              @if (bookingForm.projectId().touched() && bookingForm.projectId().invalid()) {
                <p class="field-error">{{ bookingForm.projectId().errors()[0].message }}</p>
              }
            </div>
            <div>
              <label class="form-label" for="booking-hours">Hours per day</label>
              <input id="booking-hours" class="form-input" type="number" step="0.5" [formField]="bookingForm.hoursPerDay" />
              @if (bookingForm.hoursPerDay().touched() && bookingForm.hoursPerDay().invalid()) {
                <p class="field-error">{{ bookingForm.hoursPerDay().errors()[0].message }}</p>
              }
            </div>
            <div>
              <label class="form-label" for="booking-notes">Notes</label>
              <textarea id="booking-notes" class="form-input" rows="2" [formField]="bookingForm.notes"></textarea>
              @if (bookingForm.notes().touched() && bookingForm.notes().invalid()) {
                <p class="field-error">{{ bookingForm.notes().errors()[0].message }}</p>
              }
            </div>
          </div>

          <div class="mt-6 flex items-center gap-2">
            @if (draft().allocation) {
              <button type="button" class="btn-quiet text-over-700" (click)="deleted.emit()">Delete</button>
            }
            <button type="button" class="btn-secondary ml-auto" (click)="closed.emit()">Cancel</button>
            <button type="submit" class="btn-primary">{{ draft().allocation ? 'Save' : 'Book' }}</button>
          </div>
        </form>
      }
    </div>
  `,
})
export class AllocationPopover {
  private readonly locale = inject(LOCALE_ID);

  readonly draft = input.required<BookingDraft>();
  readonly projects = input.required<Project[]>();
  /** Team Admins book work (D24); everyone else can only ask for time off on their own row. */
  readonly canBook = input(true);
  /** The viewer's own person, whose row's days can be asked for as time off. */
  readonly ownPersonId = input<string | null>(null);
  readonly saved = output<BookingDetails>();
  readonly deleted = output<void>();
  readonly timeOffRequested = output<void>();
  readonly closed = output<void>();

  protected readonly isOwnRow = computed(() => this.draft().personId === this.ownPersonId());

  /** Opens on Booking for those who can book, otherwise on Time off. */
  protected readonly tab = linkedSignal<Tab>(() => (this.canBook() || this.draft().allocation ? 'booking' : 'timeOff'));

  protected readonly heading = computed(() => {
    if (this.draft().allocation) return 'Booking';
    return this.tab() === 'timeOff' ? 'Time off' : 'New booking';
  });

  /** "Tue 3 Nov" or "Tue 3 Nov – Fri 6 Nov". */
  protected readonly dates = computed(() => {
    const { startDate, endDate } = this.draft();
    const date = (d: string) => formatDate(d, 'EEE d MMM', this.locale);
    return startDate === endDate ? date(startDate) : `${date(startDate)} – ${date(endDate)}`;
  });

  protected readonly projectOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Choose a project' },
    ...this.projects().map((p) => ({ value: p.id, label: p.name, colour: p.colour })),
  ]);

  protected readonly model = linkedSignal<BookingForm>(() => {
    const allocation = this.draft().allocation;
    return {
      projectId: allocation?.projectId ?? '',
      hoursPerDay: allocation?.hoursPerDay ?? DEFAULT_HOURS_PER_DAY,
      notes: allocation?.notes ?? '',
    };
  });

  protected readonly bookingForm = form(this.model, (booking) => {
    required(booking.projectId, { message: 'Choose a project.' });
    required(booking.hoursPerDay, { message: 'Enter the hours per day.' });
    min(booking.hoursPerDay, 0.5, { message: 'Book at least half an hour a day.' });
    max(booking.hoursPerDay, 24, { message: 'A day has 24 hours.' });
    maxLength(booking.notes, 1000, { message: 'Keep the notes under 1000 characters.' });
  });

  protected tabClass(tab: Tab): string {
    return segmentClass(this.tab() === tab);
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.bookingForm, async () => {
      const { projectId, hoursPerDay, notes } = this.model();
      this.saved.emit({ projectId, hoursPerDay: hoursPerDay!, notes: notes.trim() || null });
      return undefined;
    });
  }
}
