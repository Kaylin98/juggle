import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { Component, LOCALE_ID, computed, inject, input, linkedSignal, output, resource } from '@angular/core';
import { FormField, form, max, min, required, submit } from '@angular/forms/signals';
import { AllocationsService } from '../../core/allocations.service';
import { JobsService } from '../../core/jobs.service';
import { AllocationCheck, Job, Person } from '../../core/models';
import { ClashDialog } from '../../shared/clash-dialog';
import { capacityLine, lateText, scheduledMessage } from '../../shared/clash-message';
import { addWeekdays, isIsoDate, nextWeekday, today } from '../../shared/dates';
import { Select, SelectOption } from '../../shared/select';
import { ToastService } from '../../shared/toast.service';

/** A new booking starts as a week at this many hours a day. */
const DEFAULT_DAYS = 5;
const DEFAULT_HOURS_PER_DAY = 4;

/** The confirmation opens above the button, or below it when there is no room. */
const CONFIRM_POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
];

/** What a booking runs into, waiting for Cancel or "Book anyway". */
interface Warning {
  check: AllocationCheck;
  late: string | null;
}

/**
 * Allocate and schedule: picks the designer, the estimate and the booking that schedules them. It shows what the
 * booking would run into as the dates change, and asks once before saving if it runs into anything.
 */
@Component({
  selector: 'app-allocate-form',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, ClashDialog, FormField, Select],
  template: `
    <form class="max-w-180 rounded-control bg-surface-muted p-4" novalidate (submit)="allocate($event)">
      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2">
          <label class="form-label" for="allocate-person">Designer</label>
          <app-select
            triggerId="allocate-person"
            placeholder="Choose a designer"
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
      @for (field of fields(); track $index) {
        @if (field().touched() && field().invalid()) {
          <p class="field-error">{{ field().errors()[0].message }}</p>
        }
      }
      @if (warnings().length > 0) {
        <div class="mt-4 rounded-control bg-warn-50 p-3 text-sm text-warn-700" role="status">
          @for (line of warnings(); track line) {
            <p>{{ line }}</p>
          }
          @if (canFit()) {
            <button type="button" class="btn-quiet mt-2 -ml-3" (click)="fit()">
              Fit before deadline
            </button>
          }
        </div>
      }
      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="closed.emit()">Back</button>
        <button
          #origin="cdkOverlayOrigin"
          cdkOverlayOrigin
          type="submit"
          class="btn-primary"
          [disabled]="allocateForm().submitting()"
        >
          Allocate and schedule
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
            [personName]="designerName()"
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
export class AllocateForm {
  private readonly allocations = inject(AllocationsService);
  private readonly jobs = inject(JobsService);
  private readonly toast = inject(ToastService);
  private readonly locale = inject(LOCALE_ID);

  readonly job = input.required<Job>();
  readonly people = input.required<Person[]>();
  readonly done = output<void>();
  readonly closed = output<void>();

  protected readonly confirmPositions = CONFIRM_POSITIONS;

  /** A revision starts on the designer who did the first round. */
  protected readonly model = linkedSignal(() => ({
    personId: this.job().designerPersonId ?? '',
    estimateHours: (DEFAULT_DAYS * DEFAULT_HOURS_PER_DAY) as number | null,
    startDate: nextWeekday(today()),
    days: DEFAULT_DAYS as number | null,
    hoursPerDay: DEFAULT_HOURS_PER_DAY as number | null,
  }));

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

  /** Read once the inputs are set: the model starts from the job. */
  protected readonly fields = computed(() => [
    this.allocateForm.personId,
    this.allocateForm.estimateHours,
    this.allocateForm.startDate,
    this.allocateForm.days,
    this.allocateForm.hoursPerDay,
  ]);

  /** The last day of the booking, once the start and the days are filled in. */
  private readonly endDate = computed(() => {
    const { startDate, days } = this.model();
    return isIsoDate(startDate) && days !== null && days >= 1 && days <= 260
      ? addWeekdays(startDate, Math.round(days) - 1)
      : null;
  });

  /** Each person's free hours over the chosen dates. */
  private readonly availability = resource({
    params: () => {
      const end = this.endDate();
      return end ? { teamId: this.job().teamId, start: this.model().startDate, end } : undefined;
    },
    loader: ({ params }) => this.allocations.availability(params.teamId, params.start, params.end),
  });

  /** The people with the most free hours first, each showing how many. */
  protected readonly personOptions = computed<SelectOption[]>(() => {
    const free = new Map((this.availability.hasValue() ? this.availability.value() : []).map((a) => [a.personId, a.freeHours]));
    return this.people()
      .map((p) => ({
        value: p.id,
        label: p.name,
        avatarColour: p.avatarColour,
        detail: free.has(p.id) ? `${free.get(p.id)}h free` : undefined,
        free: free.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.free - a.free || a.label.localeCompare(b.label));
  });

  /** What the booking would run into with the dates as they are now. */
  private readonly check = resource({
    params: () => {
      const { personId, startDate, hoursPerDay } = this.model();
      const end = this.endDate();
      return personId && end && hoursPerDay !== null && hoursPerDay >= 0.5
        ? { jobId: this.job().id, personId, startDate, endDate: end, hoursPerDay }
        : undefined;
    },
    loader: ({ params }) => this.allocations.check(params),
  });

  protected readonly warnings = computed(() => {
    const check = this.check.hasValue() ? this.check.value() : null;
    const end = this.endDate();
    if (!check || !end) return [];
    return [
      capacityLine(check.clashDays, check.leaveDays, this.locale),
      lateText(check.deadline, end, check.workingDaysLate, this.locale),
    ].filter((line) => line !== null);
  });

  /** The booking finishes late and some working days remain before the deadline to fit it into. */
  protected readonly canFit = computed(() => {
    const check = this.check.hasValue() ? this.check.value() : null;
    const estimate = this.model().estimateHours;
    return !!check && check.workingDaysLate > 0 && check.workingDaysToDeadline >= 1 && !!estimate && estimate > 0;
  });

  /** The booking waiting for Cancel or "Book anyway". */
  protected readonly warning = linkedSignal<Job, Warning | null>({ source: this.job, computation: () => null });

  protected readonly designerName = computed(
    () => this.people().find((p) => p.id === this.model().personId)?.name ?? '',
  );

  /** Squeezes the booking in before the deadline: the working days left, at the hours a day the estimate then needs. */
  protected fit(): void {
    const days = this.check.value()!.workingDaysToDeadline;
    const estimate = this.model().estimateHours!;
    this.model.update((m) => ({ ...m, days, hoursPerDay: Math.max(0.5, Math.ceil((estimate / days) * 2) / 2) }));
  }

  protected async allocate(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.allocateForm, async () => {
      const { personId, startDate, hoursPerDay } = this.model();
      const endDate = this.endDate()!;
      try {
        const check = await this.allocations.check({
          jobId: this.job().id,
          personId,
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

  /** Saves the booking and the status change together. */
  protected async book(): Promise<void> {
    this.warning.set(null);
    const { personId, estimateHours, startDate, hoursPerDay } = this.model();
    const endDate = this.endDate()!;
    try {
      const result = await this.jobs.allocate(this.job().id, {
        personId,
        startDate,
        endDate,
        hoursPerDay: hoursPerDay!,
        estimateHours: estimateHours!,
      });
      const message = scheduledMessage(this.designerName(), startDate, endDate, result, this.locale);
      this.toast.show(message.text, message.kind);
      this.done.emit();
    } catch (error) {
      this.toast.error(error);
    }
  }
}
