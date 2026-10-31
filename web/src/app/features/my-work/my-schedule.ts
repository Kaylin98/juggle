import { DatePipe } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, input } from '@angular/core';
import { Allocation, DayLoad } from '../../core/models';
import { formatDateRange } from '../../shared/dates';
import { Load, bookedShare, dayState, formatHours, totalLoad } from '../../shared/load-colour';
import { UtilisationMeter } from '../../shared/utilisation-meter';

export interface ScheduleWeek {
  label: string;
  dates: string;
  /** Booked and working hours over the week, for its utilisation. */
  load: Load;
  days: { load: DayLoad; bookings: Allocation[] }[];
}

/** The days in weeks of five (Monday to Friday), each day with the bookings that cover it. */
export function scheduleWeeks(days: DayLoad[], bookings: Allocation[], locale: string): ScheduleWeek[] {
  const weeks: ScheduleWeek[] = [];
  for (let i = 0; i < days.length; i += 5) {
    const week = days.slice(i, i + 5);
    weeks.push({
      label: i === 0 ? 'This week' : 'Next week',
      dates: formatDateRange(week[0].date, week.at(-1)!.date, locale),
      load: totalLoad(week),
      days: week.map((load) => ({
        load,
        bookings: load.timeOff ? [] : bookings.filter((b) => b.startDate <= load.date && load.date <= b.endDate),
      })),
    });
  }
  return weeks;
}

/**
 * The person's schedule for this week and next, read-only: per day the schedule's availability strip, then their
 * bookings or the reason the day is off; per week their utilisation in the schedule's colours.
 */
@Component({
  selector: 'app-my-schedule',
  imports: [DatePipe, UtilisationMeter],
  host: { class: 'panel block p-6' },
  template: `
    <h2 class="font-display text-lg font-semibold">My schedule</h2>
    <p class="mt-1 text-sm text-ink-muted">Your bookings in every team, {{ hoursPerDay() }}h a working day</p>

    <div class="mt-6 space-y-6">
      @for (week of weeks(); track week.label) {
        <div class="grid grid-cols-[9rem_repeat(5,minmax(0,1fr))] gap-2">
          <div class="pr-4">
            <div class="label-caps">{{ week.label }}</div>
            <div class="mt-1 text-xs text-ink-muted">{{ week.dates }}</div>
            <app-utilisation-meter class="mt-3" [load]="week.load" />
          </div>
          @for (day of week.days; track day.load.date) {
            @let today = day.load.date === this.today();
            <div class="min-h-28 rounded-control p-2" [class]="today ? 'bg-accent-50' : 'bg-page'">
              <div class="flex items-baseline justify-between gap-2">
                <span class="font-display text-sm font-semibold" [class.text-accent-600]="today">{{ day.load.date | date: 'EEE d' }}</span>
                @if (day.load.capacity > 0) {
                  <span class="text-[11px] text-ink-muted">{{ hours(day.load.allocated) }}/{{ hours(day.load.capacity) }}h</span>
                }
              </div>
              <!-- The schedule's fill bar: booked hours in a neutral tone, free hours in green; all red when over. -->
              @if (dayState(day.load) !== 'off') {
                <div class="mt-2 flex h-1.5 overflow-hidden rounded-full" [class]="dayState(day.load) === 'over' ? 'bg-over-500' : 'bg-ok-500'">
                  @if (dayState(day.load) === 'working') {
                    <div class="bg-ink-faint" [style.width.%]="bookedShare(day.load) * 100"></div>
                  }
                </div>
              } @else {
                <div class="mt-2 h-1.5"></div>
              }
              <div class="mt-2 space-y-1">
                @if (day.load.timeOff) {
                  <div class="rounded-bar bg-ink px-2 py-1.5 text-xs leading-tight text-white">
                    @if (day.load.publicHoliday) {
                      <span class="block font-semibold">Public holiday</span>
                      <span class="block">{{ day.load.timeOff }}</span>
                    } @else {
                      <span class="block font-semibold">{{ day.load.timeOff }}</span>
                    }
                  </div>
                }
                @for (booking of day.bookings; track booking.id) {
                  <div
                    class="hue-booking hue-edge flex items-baseline gap-1 rounded-bar border-l-3 px-2 py-1 text-xs"
                    [style.--hue]="booking.projectColour"
                    [attr.aria-label]="booking.projectName + ', ' + hours(booking.hoursPerDay) + 'h'"
                  >
                    <span class="min-w-0 flex-1 truncate">{{ booking.projectName }}</span>
                    <span class="shrink-0 font-semibold">{{ hours(booking.hoursPerDay) }}h</span>
                  </div>
                } @empty {
                  @if (!day.load.timeOff) {
                    <p class="text-xs text-ink-muted">No bookings</p>
                  }
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class MySchedule {
  private readonly locale = inject(LOCALE_ID);

  readonly days = input.required<DayLoad[]>();
  readonly bookings = input.required<Allocation[]>();
  readonly hoursPerDay = input.required<number>();
  readonly today = input.required<string>();

  protected readonly bookedShare = bookedShare;
  protected readonly dayState = dayState;
  protected readonly hours = formatHours;

  protected readonly weeks = computed(() => scheduleWeeks(this.days(), this.bookings(), this.locale));
}
