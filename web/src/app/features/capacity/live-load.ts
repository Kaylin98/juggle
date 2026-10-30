import { Allocation, DayLoad } from '../../core/models';
import { Dated } from './grid-layout';

/**
 * Each day's booked hours, added up from the bookings the way the API does (D13): bookings count only on
 * working days, so leave and holidays stay empty. The grid uses it to show a drag's effect before it is saved.
 */
export function withBookings(
  days: DayLoad[],
  allocations: Pick<Allocation, 'startDate' | 'endDate' | 'hoursPerDay'>[],
): DayLoad[] {
  return days.map((day) => ({
    ...day,
    allocated: day.timeOff
      ? 0
      : allocations
          .filter((a) => a.startDate <= day.date && day.date <= a.endDate)
          .reduce((sum, a) => sum + a.hoursPerDay, 0),
  }));
}

/** The days of a booking on which its person is booked over capacity (D16), among the days given. */
export function clashDays(booking: Dated, days: DayLoad[]): string[] {
  return days
    .filter((d) => booking.startDate <= d.date && d.date <= booking.endDate && d.capacity > 0 && d.allocated > d.capacity)
    .map((d) => d.date);
}
