import { CdkConnectedOverlay, ConnectedPosition } from '@angular/cdk/overlay';
import { Component, LOCALE_ID, computed, inject, input, linkedSignal, resource, signal } from '@angular/core';
import { AllocationsService } from '../../core/allocations.service';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { Allocation, Job, SaveAllocation, Schedule } from '../../core/models';
import { ALL_TEAMS, TeamContextService } from '../../core/team-context.service';
import { BrandLegend, legendBrands } from '../../shared/brand-legend';
import { ClashDialog } from '../../shared/clash-dialog';
import { lateText, scheduledMessage } from '../../shared/clash-message';
import { isIsoDate, startOfWeek, today, weekdaysBetween } from '../../shared/dates';
import { ToastService } from '../../shared/toast.service';
import { AllocationPopover, BookingDetails, BookingDraft } from './allocation-popover';
import { CapacityGrid, NewBooking, PopoverOrigin } from './capacity-grid';
import { CapacityService, Weeks } from './capacity.service';
import { GridToolbar } from './grid-toolbar';
import { clashDays, leaveDays, withBookings } from './live-load';
import { PeopleFilter } from './people-filter';
import { SchedulePrefsService } from './schedule-prefs.service';

// Beside the pointer or booking, flipping to the other side when there is no room.
const POPOVER_POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 8 },
  { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -8 },
  { originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom', offsetX: 8 },
  { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'bottom', offsetX: -8 },
];

@Component({
  selector: 'app-capacity-page',
  imports: [AllocationPopover, BrandLegend, CapacityGrid, CdkConnectedOverlay, ClashDialog, GridToolbar, PeopleFilter],
  templateUrl: './capacity-page.html',
})
export class CapacityPage {
  private readonly capacityService = inject(CapacityService);
  private readonly allocations = inject(AllocationsService);
  private readonly jobsService = inject(JobsService);
  private readonly locale = inject(LOCALE_ID);
  protected readonly auth = inject(AuthService);
  private readonly prefs = inject(SchedulePrefsService);
  private readonly toast = inject(ToastService);
  protected readonly teamContext = inject(TeamContextService);

  /** From the `/t/:teamId/capacity` route. */
  readonly teamId = input.required<string>();

  /** `?week=yyyy-MM-dd` (from a board card's booking chip) opens the schedule at that date's week. */
  readonly week = input<string>();

  protected readonly today = today();
  protected readonly start = linkedSignal(() => {
    const week = this.week();
    return startOfWeek(isIsoDate(week) ? week : this.today);
  });
  protected readonly weeks = signal<Weeks>(4);

  protected readonly schedule = resource({
    params: () => ({
      teamId: this.teamContext.allTeams() ? ALL_TEAMS : this.teamId(),
      start: this.start(),
      weeks: this.weeks(),
    }),
    loader: ({ params }) => this.capacityService.get(params.teamId, params.start, params.weeks),
  });

  /** Keeps the last schedule on screen while the next one loads, so paging does not flash. */
  protected readonly data = linkedSignal<Schedule | null, Schedule | null>({
    source: () => (this.schedule.hasValue() ? this.schedule.value() : null),
    computation: (value, previous) => value ?? previous?.value ?? null,
  });

  /** The people the viewer left off the schedule, remembered per user (D60). */
  protected readonly hiddenPeople = linkedSignal<ReadonlySet<string>>(() => {
    const userId = this.auth.me()?.id;
    return userId ? this.prefs.hiddenPeople(userId) : new Set<string>();
  });

  /** The schedule as the grid draws it: only the people picked in the filter, and their bookings. */
  protected readonly shown = computed<Schedule | null>(() => {
    const data = this.data();
    if (!data) return null;
    const hidden = this.hiddenPeople();
    return {
      ...data,
      people: data.people.filter((p) => !hidden.has(p.id)),
      allocations: data.allocations.filter((a) => !hidden.has(a.personId)),
    };
  });

  /** The brands of the team's own bookings shown, for the colour key; other teams' bookings are greyed (D61). */
  protected readonly brands = computed(() =>
    legendBrands(
      (this.shown()?.allocations ?? []).filter((a) => !a.otherTeam),
      (a) => ({ name: a.department, colour: a.colour }),
    ),
  );

  protected setHiddenPeople(hidden: ReadonlySet<string>): void {
    this.hiddenPeople.set(hidden);
    this.prefs.saveHiddenPeople(this.auth.me()!.id, hidden);
  }

  /** Users who book work (Allocate) book and change the schedule; everyone else sees it read-only (D24, D77). */
  protected readonly editable = computed(() => this.auth.can('Allocate'));

  /** The viewer's own row, where anyone with a Person record picks days to ask for time off (D47). */
  protected readonly ownPersonId = computed(() => this.auth.me()?.personId ?? null);

  protected readonly jobs = resource({
    params: () => {
      if (!this.editable()) return undefined;
      return this.teamContext.allTeams() ? this.auth.teams().map((t) => t.id) : [this.teamId()];
    },
    loader: ({ params }) => this.capacityService.openJobs(params),
  });

  /**
   * The jobs a row's person can be booked on, by the job's rules: one still in Incoming or In Design that is not yet
   * allocated (booking it runs Allocate and schedule) or is allocated to this person.
   */
  protected bookableJobs(personId: string): Job[] {
    return (this.jobs.hasValue() ? this.jobs.value() : []).filter(
      (job) =>
        job.acceptsBookings &&
        (job.designerPersonId === personId ||
          (job.designerPersonId === null && job.actions.includes('AllocateAndSchedule'))),
    );
  }

  /** The booking popover, when open. Closes when the team or view changes. */
  protected readonly popover = linkedSignal<string, (BookingDraft & { origin: PopoverOrigin }) | null>({
    source: () => `${this.teamId()}:${this.teamContext.allTeams()}`,
    computation: () => null,
  });

  protected readonly popoverPositions = POPOVER_POSITIONS;

  /** A booking that would put someone over capacity, waiting for Cancel or "Book with overtime". */
  protected readonly clash = signal<Clash | null>(null);

  /** The days picked for a new booking stay highlighted while its popover is open. */
  protected readonly pending = computed<NewBooking | null>(() => {
    const popover = this.popover();
    return popover && !popover.allocation ? popover : null;
  });

  protected openNew({ booking, origin }: { booking: NewBooking; origin: PopoverOrigin }): void {
    this.popover.set({ ...booking, allocation: null, personName: this.personName(booking.personId), origin });
  }

  protected openExisting({ allocation, origin }: { allocation: Allocation; origin: PopoverOrigin }): void {
    const { personId, startDate, endDate } = allocation;
    this.popover.set({ allocation, personId, startDate, endDate, personName: this.personName(personId), origin });
  }

  /**
   * A booking moved or resized on the grid: shown at once, then saved. When it puts its person over capacity,
   * it stays where it was dropped while the clash dialog asks; Cancel puts it back.
   */
  protected async onChanged({ allocation, origin }: { allocation: Allocation; origin: PopoverOrigin }): Promise<void> {
    const previous = this.data()!.allocations.find((a) => a.id === allocation.id)!;
    this.replace(allocation);
    await this.saveUnlessClash(
      { ...allocation, origin },
      previous,
      () => this.save(allocation.id, toSave(allocation)),
      () => this.replace(previous),
    );
  }

  /** The popover stays open while the clash dialog asks, so Cancel goes back to it. */
  protected async onPopoverSaved(details: BookingDetails): Promise<void> {
    const { allocation, personId, startDate, endDate, origin } = this.popover()!;
    const request = { personId, startDate, endDate, ...details };
    const book = async () => {
      this.popover.set(null);
      await this.save(allocation?.id ?? null, request);
    };
    await this.saveUnlessClash({ id: allocation?.id ?? null, ...request, origin }, allocation, book, () => undefined);
  }

  /** Time off asked for from the popover's Time off tab: it shows as pending once the schedule reloads. */
  protected onTimeOffRequested(): void {
    this.popover.set(null);
    this.schedule.reload();
  }

  protected async confirmClash(): Promise<void> {
    const clash = this.clash()!;
    this.clash.set(null);
    await clash.book();
  }

  protected cancelClash(): void {
    this.clash()!.cancel();
    this.clash.set(null);
  }

  protected async onPopoverDeleted(): Promise<void> {
    const { allocation } = this.popover()!;
    this.popover.set(null);
    try {
      await this.allocations.delete(allocation!.id);
      this.toast.show('Booking deleted.');
    } catch (error) {
      this.toast.error(error);
    }
    this.schedule.reload();
  }

  /**
   * Books straight away, unless the booking would put its person over capacity on the days shown (D16), or onto
   * days of their approved leave it did not cover before: then the clash dialog asks first. Worked out from the
   * schedule's data, so nothing is sent until the user decides.
   */
  private async saveUnlessClash(
    booking: BookingCheck,
    previous: Allocation | null,
    book: () => Promise<void>,
    cancel: () => void,
  ): Promise<void> {
    const data = this.data()!;
    const person = data.people.find((p) => p.id === booking.personId)!;
    const others = data.allocations.filter((a) => a.personId === booking.personId && a.id !== booking.id);
    const overDays = clashDays(booking, withBookings(person.days, [...others, booking]));
    const late = await this.lateness(booking);
    if (late === undefined) return cancel();
    const wasOnLeave = (day: string) =>
      previous?.personId === booking.personId && previous.startDate <= day && day <= previous.endDate;
    const onLeave = leaveDays(booking, person.days).filter((day) => !wasOnLeave(day));
    if (overDays.length === 0 && onLeave.length === 0 && !late) return book();
    this.clash.set({
      personId: booking.personId,
      personName: person.name,
      clashDays: overDays,
      leaveDays: onLeave,
      lateText: late,
      origin: booking.origin,
      book,
      cancel,
    });
  }

  /** Where the booking finishes after its job's deadline, in words: null when it does not, undefined when the check failed. */
  private async lateness(booking: BookingCheck): Promise<string | null | undefined> {
    try {
      const check = await this.allocations.check({
        jobId: booking.jobId,
        personId: booking.personId,
        startDate: booking.startDate,
        endDate: booking.endDate,
        hoursPerDay: booking.hoursPerDay,
        exceptAllocationId: booking.id ?? undefined,
      });
      return lateText(check.deadline, booking.endDate, check.workingDaysLate, this.locale);
    } catch (error) {
      this.toast.error(error);
      return undefined;
    }
  }

  /** Saves and reloads the schedule for the new load. A new booking on an unallocated job runs Allocate and schedule. */
  private async save(id: string | null, request: SaveAllocation): Promise<void> {
    try {
      if (!id && this.isUnallocated(request.jobId)) {
        await this.allocate(request);
      } else {
        await (id ? this.allocations.update(id, request) : this.allocations.create(request));
        this.toast.show('Booking saved.', 'success');
      }
    } catch (error) {
      this.toast.error(error);
    }
    this.schedule.reload();
  }

  private isUnallocated(jobId: string): boolean {
    return (this.jobs.hasValue() ? this.jobs.value() : []).some((j) => j.id === jobId && j.designerPersonId === null);
  }

  /** Allocate and schedule from the schedule: the estimate is what the booking covers, and the job moves on. */
  private async allocate(request: SaveAllocation): Promise<void> {
    const { personId, startDate, endDate, hoursPerDay } = request;
    const result = await this.jobsService.allocate(request.jobId, {
      personId,
      startDate,
      endDate,
      hoursPerDay,
      estimateHours: hoursPerDay * weekdaysBetween(startDate, endDate),
    });
    const message = scheduledMessage(this.personName(personId), startDate, endDate, result, this.locale);
    this.toast.show(message.text, message.kind);
    this.jobs.reload();
  }

  private replace(allocation: Allocation): void {
    this.data.update((data) => data && { ...data, allocations: data.allocations.map((a) => (a.id === allocation.id ? allocation : a)) });
  }

  private personName(personId: string): string {
    return this.data()?.people.find((p) => p.id === personId)?.name ?? '';
  }
}

/** A booking to check for a clash before saving: its days and hours, and where to ask. */
type BookingCheck = Pick<Allocation, 'jobId' | 'personId' | 'startDate' | 'endDate' | 'hoursPerDay'> & {
  id: string | null;
  origin: PopoverOrigin;
};

interface Clash {
  personId: string;
  personName: string;
  clashDays: string[];
  leaveDays: string[];
  lateText: string | null;
  origin: PopoverOrigin;
  book: () => Promise<void>;
  cancel: () => void;
}

function toSave(allocation: Allocation): SaveAllocation {
  const { personId, jobId, startDate, endDate, hoursPerDay, notes } = allocation;
  return { personId, jobId, startDate, endDate, hoursPerDay, notes };
}
