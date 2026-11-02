import { formatDate } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, input, output, signal } from '@angular/core';
import { FormField, form, max, min, required, submit } from '@angular/forms/signals';
import { JobsService } from '../../core/jobs.service';
import { Job, Person } from '../../core/models';
import { clashText } from '../../shared/clash-message';
import { addWeekdays, nextWeekday, today } from '../../shared/dates';
import { Select, SelectOption } from '../../shared/select';
import { ToastService } from '../../shared/toast.service';

/** A new booking starts as a week at this many hours a day. */
const DEFAULT_DAYS = 5;
const DEFAULT_HOURS_PER_DAY = 4;

/** Allocate and schedule: picks the designer, the estimate and the booking that schedules them. */
@Component({
  selector: 'app-allocate-form',
  imports: [FormField, Select],
  template: `
    <form class="rounded-control bg-surface-muted p-4" novalidate (submit)="allocate($event)">
      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2">
          <label class="form-label" for="allocate-person">Designer</label>
          <app-select
            triggerId="allocate-person"
            [options]="personOptions()"
            [formField]="allocateForm.personId"
          />
        </div>
        <div>
          <label class="form-label" for="allocate-estimate">Estimate (hours)</label>
          <input
            id="allocate-estimate"
            class="form-input"
            type="number"
            step="0.5"
            [formField]="allocateForm.estimateHours"
          />
        </div>
        <div>
          <label class="form-label" for="allocate-start">Start</label>
          <input
            id="allocate-start"
            class="form-input"
            type="date"
            [formField]="allocateForm.startDate"
          />
        </div>
        <div>
          <label class="form-label" for="allocate-days">Working days</label>
          <input
            id="allocate-days"
            class="form-input"
            type="number"
            step="1"
            [formField]="allocateForm.days"
          />
        </div>
        <div>
          <label class="form-label" for="allocate-hours">Hours/day</label>
          <input
            id="allocate-hours"
            class="form-input"
            type="number"
            step="0.5"
            [formField]="allocateForm.hoursPerDay"
          />
        </div>
      </div>
      @for (field of fields; track $index) {
        @if (field().touched() && field().invalid()) {
          <p class="field-error">{{ field().errors()[0].message }}</p>
        }
      }
      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="closed.emit()">Back</button>
        <button type="submit" class="btn-primary" [disabled]="allocateForm().submitting()">
          Allocate and schedule
        </button>
      </div>
    </form>
  `,
})
export class AllocateForm {
  private readonly jobs = inject(JobsService);
  private readonly toast = inject(ToastService);
  private readonly locale = inject(LOCALE_ID);

  readonly job = input.required<Job>();
  readonly people = input.required<Person[]>();
  readonly done = output<void>();
  readonly closed = output<void>();

  protected readonly personOptions = computed<SelectOption[]>(() =>
    this.people().map((p) => ({ value: p.id, label: p.name, avatarColour: p.avatarColour })),
  );

  protected readonly model = signal({
    personId: '',
    estimateHours: (DEFAULT_DAYS * DEFAULT_HOURS_PER_DAY) as number | null,
    startDate: nextWeekday(today()),
    days: DEFAULT_DAYS as number | null,
    hoursPerDay: DEFAULT_HOURS_PER_DAY as number | null,
  });

  protected readonly allocateForm = form(this.model, (f) => {
    required(f.personId, { message: 'Choose a designer.' });
    required(f.estimateHours, { message: 'Enter the estimate in hours.' });
    min(f.estimateHours, 0.5, { message: 'The estimate must be at least half an hour.' });
    required(f.startDate, { message: 'Choose a start date.' });
    required(f.days, { message: 'Enter the number of working days.' });
    min(f.days, 1, { message: 'Book at least one day.' });
    max(f.days, 260, { message: 'Book at most a year of working days.' });
    required(f.hoursPerDay, { message: 'Enter the hours per day.' });
    min(f.hoursPerDay, 0.5, { message: 'Book at least half an hour a day.' });
    max(f.hoursPerDay, 24, { message: 'A day has 24 hours.' });
  });

  protected readonly fields = [
    this.allocateForm.personId,
    this.allocateForm.estimateHours,
    this.allocateForm.startDate,
    this.allocateForm.days,
    this.allocateForm.hoursPerDay,
  ];

  protected async allocate(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.allocateForm, async () => {
      const { personId, estimateHours, startDate, days, hoursPerDay } = this.model();
      const endDate = addWeekdays(startDate, Math.round(days!) - 1);
      try {
        const result = await this.jobs.allocate(this.job().id, {
          personId,
          startDate,
          endDate,
          hoursPerDay: hoursPerDay!,
          estimateHours: estimateHours!,
        });
        const name = this.people().find((p) => p.id === personId)!.name;
        const warnings = [
          clashText(result.clashDays, result.leaveDays, this.locale),
          result.afterRequiredDate ? 'booked past the required date' : null,
        ].filter((w) => w !== null);
        const date = (d: string) => formatDate(d, 'EEE d MMM', this.locale);
        this.toast.show(
          warnings.length
            ? `Scheduled, but ${name} is ${warnings.join(', and ')}.`
            : `Scheduled ${name} from ${date(startDate)} to ${date(endDate)}.`,
          warnings.length ? 'warning' : 'success',
        );
        this.done.emit();
      } catch (error) {
        this.toast.error(error);
      }
      return undefined;
    });
  }
}
