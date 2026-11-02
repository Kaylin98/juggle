import { DatePipe } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Job, Person } from '../../core/models';
import { TeamContextService } from '../../core/team-context.service';
import { Avatar } from '../../shared/avatar';
import { DueDate } from '../../shared/due-date';
import { formatDateRange, startOfWeek } from '../../shared/dates';
import { StatusChip } from '../../shared/status-chip';
import { Tooltip } from '../../shared/tooltip';

/** A job with what the board needs to show it. */
export interface BoardCard {
  job: Job;
  designer: Person | null;
  /** Its status is done or cancelled, so it shows no booking chip. */
  done: boolean;
  /** In a status Allocate and schedule leads to, so it shows "Starts <date>" (D76). */
  scheduled: boolean;
}

/**
 * A board card: the job ID in its brand's colour, the job name, its detailed status, and the required date, booking
 * and designer (D64). The whole card is one button that opens the job; it lies under the content, which lets clicks
 * through except on the parts with their own hint or link (required date, booking chip), since a link cannot sit inside
 * a button.
 */
@Component({
  selector: 'app-job-card',
  imports: [Avatar, DatePipe, DueDate, RouterLink, StatusChip, Tooltip],
  template: `
    @let job = card().job;
    <div class="relative rounded-card bg-surface shadow-soft transition-shadow hover:shadow-lifted">
      <button
        type="button"
        class="absolute inset-0 rounded-card focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
        [class.cursor-grab]="canDrag()"
        (click)="opened.emit()"
      >
        <span class="sr-only">{{ job.title }}, {{ job.code }}</span>
      </button>
      <div class="pointer-events-none relative px-4 py-3">
        <span class="flex items-center gap-2 text-xs text-ink-muted" [style.--hue]="job.colour">
          <span class="hue-dot size-2 shrink-0 rounded-full"></span>
          <span class="truncate">{{ job.code }}</span>
          @if (canDrag()) {
            <svg class="ml-auto size-4 shrink-0 text-ink-faint" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="6" cy="4" r="1.2" /><circle cx="10" cy="4" r="1.2" />
              <circle cx="6" cy="8" r="1.2" /><circle cx="10" cy="8" r="1.2" />
              <circle cx="6" cy="12" r="1.2" /><circle cx="10" cy="12" r="1.2" />
            </svg>
          }
        </span>
        <span class="mt-2 block font-display text-sm font-semibold">{{ job.title }}</span>
        <span class="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <app-status-chip [name]="job.statusName" [colour]="job.statusColour" />
          @if (card().scheduled && job.plannedStartDate) {
            <span class="whitespace-nowrap text-ink-muted"
              >Starts {{ job.plannedStartDate | date: 'd MMM' }}</span
            >
          }
        </span>
        <span class="mt-3 flex h-6 items-center gap-2 text-xs">
          @if (job.requiredDate) {
            <app-due-date class="pointer-events-auto shrink-0" [date]="job.requiredDate" [overdue]="job.isOverdue" />
          }
          @if (showBooking() && !card().done) {
            @if (job.bookings.length > 0) {
              <a
                class="pointer-events-auto rounded-full bg-ok-50 px-2 py-0.5 font-semibold whitespace-nowrap text-ok-700 hover:underline focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
                [routerLink]="['/t', teamContext.teamId(), 'capacity']"
                [queryParams]="{ week: bookedWeek() }"
                [appTooltip]="bookingsLabel()"
                [attr.aria-label]="
                  'Booked ' + job.bookedHours + 'h. Open the schedule at this booking'
                "
                >Booked {{ job.bookedHours }}h</a
              >
            } @else if (job.isDueSoon) {
              <span
                class="pointer-events-auto rounded-full bg-warn-50 px-2 py-0.5 font-semibold whitespace-nowrap text-warn-700"
                appTooltip="Due within 7 days and not booked"
                >Not booked</span
              >
            } @else {
              <span
                class="rounded-full bg-surface-muted px-2 py-0.5 whitespace-nowrap text-ink-muted"
                >Not booked</span
              >
            }
          }
          @if (job.revisionCount > 0) {
            <span
              class="rounded-full bg-surface-muted px-2 py-0.5 font-semibold whitespace-nowrap text-ink-muted"
            >
              Rev {{ job.revisionCount }}
            </span>
          }
          @if (detail()) {
            <span class="ml-auto truncate text-ink-muted">{{ detail() }}</span>
          } @else if (card().designer; as designer) {
            <app-avatar
              class="ml-auto"
              size="sm"
              [name]="designer.name"
              [colour]="designer.avatarColour"
            />
          }
        </span>
      </div>
    </div>
  `,
})
export class JobCard {
  private readonly locale = inject(LOCALE_ID);
  protected readonly teamContext = inject(TeamContextService);

  readonly card = input.required<BoardCard>();
  /** Shown in place of the designer, such as the team on My work. */
  readonly detail = input<string | null>(null);
  /** The booking chip (D57), shown on the board. */
  readonly showBooking = input(false);
  /** The signed-in user can act on this job, so it can be dragged to a column. */
  readonly canDrag = input(false);
  readonly opened = output<void>();

  /** The week of the first booking, where the chip opens the schedule. */
  protected readonly bookedWeek = computed(() =>
    startOfWeek(this.card().job.bookings[0].startDate),
  );

  /** One line per booking: who, when and how many hours. */
  protected readonly bookingsLabel = computed(() =>
    this.card()
      .job.bookings.map(
        (b) =>
          `${b.personName} · ${formatDateRange(b.startDate, b.endDate, this.locale)} · ${b.hours}h`,
      )
      .join('\n'),
  );
}

/** A job as a card: its designer from the people given, and whether its status is done or scheduled. */
export function toCard(
  job: Job,
  people: ReadonlyMap<string, Person>,
  scheduledStatusIds: ReadonlySet<string>,
): BoardCard {
  return {
    job,
    designer: job.designerPersonId ? (people.get(job.designerPersonId) ?? null) : null,
    done: job.statusKind !== 'Open',
    scheduled: scheduledStatusIds.has(job.statusId),
  };
}
