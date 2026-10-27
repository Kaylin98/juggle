import { DayLoad } from '../core/models';

export type LoadLevel = 'off' | 'green' | 'amber' | 'red';

/** A period's utilisation: the load levels, plus "available" under 50% so under-loaded people stand out. */
export type UtilisationLevel = LoadLevel | 'available';

/** A day in the availability strip: worked (booked up to capacity), over capacity, or not worked. */
export type DayState = 'working' | 'over' | 'off';

/** Booked and available hours, for a day or a period. */
export type Load = Pick<DayLoad, 'allocated' | 'capacity'>;

/** D15: green under 80%, amber 80 to 100%, red over 100%. Without capacity it is off. */
export function loadLevel(load: Load): LoadLevel {
  if (load.capacity === 0) return 'off';
  const ratio = load.allocated / load.capacity;
  if (ratio > 1) return 'red';
  return ratio >= 0.8 ? 'amber' : 'green';
}

export function utilisationLevel(load: Load): UtilisationLevel {
  const level = loadLevel(load);
  return level === 'green' && load.allocated / load.capacity < 0.5 ? 'available' : level;
}

export function dayState(day: Load): DayState {
  if (day.capacity === 0) return 'off';
  return day.allocated > day.capacity ? 'over' : 'working';
}

/** The share of a day's capacity that is booked, from 0 to 1, for the availability strip's fill. */
export function bookedShare(day: Load): number {
  return day.capacity === 0 ? 0 : Math.min(1, day.allocated / day.capacity);
}

/** The days added up, for utilisation over a period (D14). */
export function totalLoad(days: DayLoad[]): Load {
  return days.reduce((sum, day) => ({ allocated: sum.allocated + day.allocated, capacity: sum.capacity + day.capacity }), {
    allocated: 0,
    capacity: 0,
  });
}

export const UTILISATION_TEXT: Record<UtilisationLevel, string> = {
  off: 'text-ink-muted',
  available: 'text-accent-700',
  green: 'text-ok-700',
  amber: 'text-warn-700',
  red: 'text-over-700',
};

export const UTILISATION_BAR: Record<UtilisationLevel, string> = {
  off: 'bg-line-strong',
  available: 'bg-accent-500',
  green: 'bg-ok-500',
  amber: 'bg-warn-500',
  red: 'bg-over-500',
};

/** Hours as a short label: 5, 2.5. */
export function formatHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}
