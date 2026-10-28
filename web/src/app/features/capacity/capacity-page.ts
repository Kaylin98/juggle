import { CdkConnectedOverlay, ConnectedPosition } from '@angular/cdk/overlay';
import { Component, LOCALE_ID, computed, inject, input, linkedSignal, resource, signal } from '@angular/core';
import { AllocationsService } from '../../core/allocations.service';
import { AuthService } from '../../core/auth.service';
import { Allocation, SaveAllocation, Schedule } from '../../core/models';
import { ALL_TEAMS, TeamContextService } from '../../core/team-context.service';
import { clashMessage } from '../../shared/clash-message';
import { startOfWeek, today } from '../../shared/dates';
import { ToastService } from '../../shared/toast.service';
import { AllocationPopover, BookingDetails, BookingDraft } from './allocation-popover';
import { CapacityGrid, NewBooking, PopoverOrigin } from './capacity-grid';
import { CapacityService, Weeks } from './capacity.service';
import { GridToolbar } from './grid-toolbar';

// Beside the pointer or booking, flipping to the other side when there is no room.
const POPOVER_POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 8 },
  { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -8 },
  { originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom', offsetX: 8 },
  { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'bottom', offsetX: -8 },
];

@Component({
  selector: 'app-capacity-page',
  imports: [AllocationPopover, CapacityGrid, CdkConnectedOverlay, GridToolbar],
  templateUrl: './capacity-page.html',
})
export class CapacityPage {
  private readonly capacityService = inject(CapacityService);
  private readonly allocations = inject(AllocationsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly locale = inject(LOCALE_ID);
  protected readonly teamContext = inject(TeamContextService);

  /** From the `/t/:teamId/capacity` route. */
  readonly teamId = input.required<string>();

  protected readonly today = today();
  protected readonly start = signal(startOfWeek(this.today));
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

  /** Team Admins book and change their team's work; Members see the schedule read-only (D24). */
  protected readonly editable = computed(() => this.teamContext.allTeams() || this.teamContext.isTeamAdmin());

  protected readonly projects = resource({
    params: () => {
      if (!this.editable()) return undefined;
      return this.teamContext.allTeams() ? this.auth.teams().map((t) => t.id) : [this.teamId()];
    },
    loader: ({ params }) => this.capacityService.projects(params),
  });

  /** The booking popover, when open. Closes when the team or view changes. */
  protected readonly popover = linkedSignal<string, (BookingDraft & { origin: PopoverOrigin }) | null>({
    source: () => `${this.teamId()}:${this.teamContext.allTeams()}`,
    computation: () => null,
  });

  protected readonly popoverPositions = POPOVER_POSITIONS;

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

  /** A booking moved or resized on the grid: shown at once, then saved. */
  protected async onChanged(allocation: Allocation): Promise<void> {
    this.data.update((data) => data && { ...data, allocations: data.allocations.map((a) => (a.id === allocation.id ? allocation : a)) });
    await this.save(allocation.id, toSave(allocation), allocation.personId);
  }

  protected async onPopoverSaved(details: BookingDetails): Promise<void> {
    const { allocation, personId, startDate, endDate } = this.popover()!;
    this.popover.set(null);
    const request = { personId, startDate, endDate, taskId: allocation?.taskId ?? null, ...details };
    await this.save(allocation?.id ?? null, request, personId);
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

  /** Saves, warns when the person is now over capacity (D16), and reloads the schedule for the new load. */
  private async save(id: string | null, request: SaveAllocation, personId: string): Promise<void> {
    try {
      const saved = id ? await this.allocations.update(id, request) : await this.allocations.create(request);
      const clash = clashMessage(this.personName(personId), saved.clashDays, this.locale);
      this.toast.show(clash ?? 'Booking saved.', clash ? 'warning' : 'success');
    } catch (error) {
      this.toast.error(error);
    }
    this.schedule.reload();
  }

  private personName(personId: string): string {
    return this.data()?.people.find((p) => p.id === personId)?.name ?? '';
  }
}

function toSave(allocation: Allocation): SaveAllocation {
  const { personId, projectId, taskId, startDate, endDate, hoursPerDay, notes } = allocation;
  return { personId, projectId, taskId, startDate, endDate, hoursPerDay, notes };
}
