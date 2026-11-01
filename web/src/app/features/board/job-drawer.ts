import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TeamContextService } from '../../core/team-context.service';
import { startOfWeek } from '../../shared/dates';
import { Drawer } from '../../shared/drawer';
import { StatusChip } from '../../shared/status-chip';
import { DELIVERABLE_LABELS } from '../requests/brief-fields';
import { BookOnSchedule } from './book-on-schedule';
import { BoardCard } from './job-card';

/**
 * A job from the board or My work: its status, who does it and when, and the brief. Users who book work (Allocate)
 * book its designer on the schedule from here or view its bookings there (D28, D59). Jobs move through workflow
 * actions, which come in Phase W, so nothing else changes here yet.
 */
@Component({
  selector: 'app-job-drawer',
  imports: [BookOnSchedule, DatePipe, Drawer, RouterLink, StatusChip],
  template: `
    @let job = card().job;
    <app-drawer [heading]="auth.terms().job" (closed)="closed.emit()">
      <div class="space-y-6 px-6 pt-2 pb-6">
        <div>
          <div class="flex items-center gap-2 text-sm text-ink-muted" [style.--hue]="job.colour">
            <span class="hue-dot size-2 shrink-0 rounded-full"></span>
            <span class="truncate">{{ job.code }}</span>
          </div>
          <h3 class="mt-2 font-display text-lg font-semibold">{{ job.title }}</h3>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <app-status-chip [name]="job.statusName" [colour]="job.statusColour" />
            @if (card().scheduled && job.plannedStartDate) {
              <span class="text-ink-muted">Starts {{ job.plannedStartDate | date: 'EEE d MMM' }}</span>
            }
          </div>
        </div>

        <!--
          Unbooked: "Book on schedule". Booked: "View on schedule", and "Add booking" until the estimate is booked (D59).
          Others see a job's bookings through the card's chip.
        -->
        @if (canBook() && !card().done) {
          @if (booking() && card().designer; as designer) {
            <app-book-on-schedule [job]="job" [designer]="designer" (closed)="booking.set(false)" (booked)="booked.emit()" />
          } @else if (job.bookings.length > 0) {
            <div class="flex items-center gap-4">
              <a
                class="btn-secondary inline-flex flex-1 items-center justify-center"
                [routerLink]="['/t', teamContext.teamId(), 'capacity']"
                [queryParams]="{ week: bookedWeek() }"
                >View on schedule</a
              >
              @if (canAddBooking()) {
                <button type="button" class="btn-quiet" (click)="booking.set(true)">Add booking</button>
              }
            </div>
          } @else if (card().designer) {
            <button type="button" class="btn-secondary w-full" (click)="booking.set(true)">Book on schedule</button>
          }
        }

        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="label-caps">Designer</dt>
            <dd class="mt-1">{{ job.designerName ?? 'Not allocated yet' }}</dd>
          </div>
          <div>
            <dt class="label-caps">Estimate</dt>
            <dd class="mt-1">{{ job.estimateHours === null ? '-' : job.estimateHours + 'h' }}</dd>
          </div>
          <div>
            <dt class="label-caps">Planned start</dt>
            <dd class="mt-1">{{ job.plannedStartDate ? (job.plannedStartDate | date: 'EEE d MMM y') : '-' }}</dd>
          </div>
          <div>
            <dt class="label-caps">Expected completion</dt>
            <dd class="mt-1">{{ job.expectedCompletionDate ? (job.expectedCompletionDate | date: 'EEE d MMM y') : '-' }}</dd>
          </div>
          <div>
            <dt class="label-caps">Required</dt>
            <dd class="mt-1" [class]="job.isOverdue ? 'font-semibold text-over-700' : ''">
              {{ job.requiredDate ? (job.requiredDate | date: 'EEE d MMM y') : 'No date' }}
            </dd>
          </div>
          <div>
            <dt class="label-caps">Priority</dt>
            <dd class="mt-1">{{ job.priority }}</dd>
          </div>
          <div>
            <dt class="label-caps">Requested by</dt>
            <dd class="mt-1">{{ job.requesterName }}</dd>
          </div>
          <div>
            <dt class="label-caps">Briefed in</dt>
            <dd class="mt-1">{{ job.createdAt | date: 'EEE d MMM y' }}</dd>
          </div>
        </dl>

        <div class="space-y-4 border-t border-line pt-6 text-sm">
          <div>
            <h4 class="label-caps">Purpose</h4>
            <p class="mt-1 whitespace-pre-line" [class.text-ink-muted]="!job.purpose">{{ job.purpose ?? 'No purpose given.' }}</p>
          </div>
          <div>
            <h4 class="label-caps">Deliverables</h4>
            <ul class="mt-1 space-y-2">
              @for (deliverable of job.deliverables; track $index) {
                <li>
                  <span class="font-semibold">{{ deliverable.description }}</span>
                  <span class="block text-ink-muted">
                    {{ deliverableLabels[deliverable.type] }}
                    @if (deliverable.specifications) {
                      &middot; {{ deliverable.specifications }}
                    }
                    @if (deliverable.dueDate) {
                      &middot; by {{ deliverable.dueDate | date: 'd MMM' }}
                    }
                  </span>
                </li>
              } @empty {
                <li class="text-ink-muted">No deliverables listed.</li>
              }
            </ul>
          </div>
        </div>
      </div>
    </app-drawer>
  `,
})
export class JobDrawer {
  protected readonly auth = inject(AuthService);
  protected readonly teamContext = inject(TeamContextService);

  readonly card = input.required<BoardCard>();
  /** Users who book work (Allocate) book the designer from here (D28, D59). */
  readonly canBook = input(false);
  readonly closed = output<void>();
  /** A booking was made from here, so the job's booked hours changed. */
  readonly booked = output<void>();

  protected readonly deliverableLabels = DELIVERABLE_LABELS;

  /** The week of the first booking, where "View on schedule" opens the schedule (as the card's chip does). */
  protected readonly bookedWeek = computed(() => startOfWeek(this.card().job.bookings[0].startDate));

  /** Another booking is offered until the bookings cover the estimate; always when there is no estimate (D59). */
  protected readonly canAddBooking = computed(() => {
    const { estimateHours, bookedHours } = this.card().job;
    return this.card().designer !== null && (estimateHours === null || bookedHours < estimateHours);
  });

  /** The booking form is open. Closes when another job opens. */
  protected readonly booking = linkedSignal({ source: () => this.card().job.id, computation: () => false });
}
