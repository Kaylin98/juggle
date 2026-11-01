import { Component, computed, input, model } from '@angular/core';
import { Job, Person } from '../../core/models';
import { Select, SelectOption } from '../../shared/select';

const DUE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Any date' },
  { value: 'overdue', label: 'Overdue' },
];

const BOOKING_OPTIONS: SelectOption[] = [
  { value: '', label: 'Any' },
  { value: 'unbooked', label: 'Not booked' },
];

/** Designer, brand, required date and booking filters. An empty value means "all". */
@Component({
  selector: 'app-board-filters',
  imports: [Select],
  host: { class: 'flex items-center gap-6' },
  template: `
    <label class="flex items-center gap-3">
      <span class="label-caps">Designer</span>
      <app-select variant="pill" [options]="designerOptions()" [(value)]="designerId" />
    </label>
    <label class="flex items-center gap-3">
      <span class="label-caps">{{ departmentLabel() }}</span>
      <app-select variant="pill" [options]="departmentOptions()" [(value)]="departmentId" />
    </label>
    <label class="flex items-center gap-3">
      <span class="label-caps">Due</span>
      <app-select variant="pill" [options]="dueOptions" [(value)]="due" />
    </label>
    <label class="flex items-center gap-3">
      <span class="label-caps">Booking</span>
      <app-select variant="pill" [options]="bookingOptions" [(value)]="booking" />
    </label>
    @if (designerId() || departmentId() || due() || booking()) {
      <button type="button" class="btn-quiet" (click)="clear()">Clear</button>
    }
  `,
})
export class BoardFilters {
  readonly people = input.required<Person[]>();
  /** The board's jobs, whose brands the brand filter offers. */
  readonly jobs = input.required<Job[]>();
  /** The org's word for a department, such as "Brand" (D48). */
  readonly departmentLabel = input.required<string>();
  readonly designerId = model.required<string>();
  readonly departmentId = model.required<string>();
  /** "overdue" shows only open jobs required before today. */
  readonly due = model.required<string>();
  /** "unbooked" shows only open jobs with no booking (D57). */
  readonly booking = model.required<string>();

  protected readonly dueOptions = DUE_OPTIONS;
  protected readonly bookingOptions = BOOKING_OPTIONS;

  protected readonly designerOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Everyone' },
    ...this.people().map((p) => ({ value: p.id, label: p.name, avatarColour: p.avatarColour })),
  ]);

  /** The brands of the board's jobs, by name, each with its colour dot. */
  protected readonly departmentOptions = computed<SelectOption[]>(() => {
    const brands = new Map(this.jobs().map((j) => [j.departmentId, { label: j.department, colour: j.colour }]));
    return [
      { value: '', label: `All ${this.departmentLabel().toLowerCase()}s` },
      ...[...brands].map(([value, brand]) => ({ value, ...brand })).sort((a, b) => a.label.localeCompare(b.label)),
    ];
  });

  protected clear(): void {
    this.designerId.set('');
    this.departmentId.set('');
    this.due.set('');
    this.booking.set('');
  }
}

export interface JobFilters {
  designerId: string;
  departmentId: string;
  due: string;
  booking: string;
}

/** Done and cancelled jobs are never "not booked". */
export function matchesFilters(job: Job, filters: JobFilters): boolean {
  return (
    (!filters.designerId || job.designerPersonId === filters.designerId) &&
    (!filters.departmentId || job.departmentId === filters.departmentId) &&
    (filters.due !== 'overdue' || job.isOverdue) &&
    (filters.booking !== 'unbooked' || (job.bookings.length === 0 && job.statusKind === 'Open'))
  );
}
