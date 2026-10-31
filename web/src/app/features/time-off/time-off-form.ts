import { Component, inject, input, linkedSignal, output } from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { MyTimeOff, TimeOffType } from '../../core/models';
import { TimeOffService } from '../../core/time-off.service';
import { Select, SelectOption } from '../../shared/select';
import { ToastService } from '../../shared/toast.service';

export const TIME_OFF_TYPES: SelectOption[] = [
  { value: 'AnnualLeave', label: 'Annual leave' },
  { value: 'SickLeave', label: 'Sick leave' },
  { value: 'FamilyResponsibility', label: 'Family responsibility' },
  { value: 'StudyLeave', label: 'Study leave' },
  { value: 'Other', label: 'Other' },
];

/**
 * Asks for time off for the signed-in person: type, dates and an optional note. Used in the My work drawer, with two
 * columns of dates when there is room, and in the schedule popover, which uses the days picked on the grid.
 */
@Component({
  selector: 'app-time-off-form',
  imports: [FormField, Select],
  host: { class: '@container block' },
  template: `
    <form novalidate (submit)="send($event)">
      <div class="space-y-4">
        <div>
          <label class="form-label" for="time-off-type">Type</label>
          <app-select triggerId="time-off-type" [options]="types" [formField]="timeOffForm.type" />
        </div>
        @if (showDates()) {
          <div class="grid gap-4 @sm:grid-cols-2">
            <div>
              <label class="form-label" for="time-off-start">From</label>
              <input id="time-off-start" class="form-input" type="date" [formField]="timeOffForm.startDate" />
              @if (timeOffForm.startDate().touched() && timeOffForm.startDate().invalid()) {
                <p class="field-error">{{ timeOffForm.startDate().errors()[0].message }}</p>
              }
            </div>
            <div>
              <label class="form-label" for="time-off-end">To</label>
              <input id="time-off-end" class="form-input" type="date" [formField]="timeOffForm.endDate" />
              @if (timeOffForm.endDate().touched() && timeOffForm.endDate().invalid()) {
                <p class="field-error">{{ timeOffForm.endDate().errors()[0].message }}</p>
              }
            </div>
          </div>
        }
        <div>
          <label class="form-label" for="time-off-note">Note <span class="font-normal text-ink-muted">(optional)</span></label>
          <textarea id="time-off-note" class="form-input" rows="2" [formField]="timeOffForm.note"></textarea>
          @if (timeOffForm.note().touched() && timeOffForm.note().invalid()) {
            <p class="field-error">{{ timeOffForm.note().errors()[0].message }}</p>
          }
        </div>
        <p class="text-xs text-ink-muted">A team admin approves it. Until then it shows as pending on the schedule.</p>
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="cancelled.emit()">Cancel</button>
        <button type="submit" class="btn-primary" [disabled]="timeOffForm().submitting()">Request time off</button>
      </div>
    </form>
  `,
})
export class TimeOffForm {
  private readonly timeOff = inject(TimeOffService);
  private readonly toast = inject(ToastService);

  readonly startDate = input('');
  readonly endDate = input('');
  /** The schedule popover shows the days picked on the grid instead, as its Booking tab does. */
  readonly showDates = input(true);
  readonly requested = output<MyTimeOff>();
  readonly cancelled = output<void>();

  protected readonly types = TIME_OFF_TYPES;

  protected readonly model = linkedSignal(() => ({
    type: 'AnnualLeave',
    startDate: this.startDate(),
    endDate: this.endDate(),
    note: '',
  }));

  protected readonly timeOffForm = form(this.model, (timeOff) => {
    required(timeOff.startDate, { message: 'Choose the first day.' });
    required(timeOff.endDate, { message: 'Choose the last day.' });
    validate(timeOff.endDate, ({ value, valueOf }) =>
      value() && value() < valueOf(timeOff.startDate)
        ? { kind: 'order', message: 'The last day must be on or after the first.' }
        : undefined,
    );
    maxLength(timeOff.note, 500, { message: 'Keep the note under 500 characters.' });
  });

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.timeOffForm, async () => {
      const { type, startDate, endDate, note } = this.model();
      try {
        const created = await this.timeOff.request({ type: type as TimeOffType, startDate, endDate, note: note.trim() || null });
        this.toast.show('Time off requested.', 'success');
        this.requested.emit(created);
      } catch (error) {
        this.toast.error(error);
      }
      return undefined;
    });
  }
}
