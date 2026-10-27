import { DayLoad } from '../core/models';

export type LoadLevel = 'off' | 'green' | 'amber' | 'red';

/** Booked and available hours, for a day or a period. */
export type Load = Pick<DayLoad, 'allocated' | 'capacity'>;

/** D15: green under 80%, amber 80 to 100%, red over 100%. Without capacity it is off. */
export function loadLevel(load: Load): LoadLevel {
  if (load.capacity === 0) return 'off';
  const ratio = load.allocated / load.capacity;
  if (ratio > 1) return 'red';
  return ratio >= 0.8 ? 'amber' : 'green';
}

/** The days added up, for utilisation over a period (D14). */
export function totalLoad(days: DayLoad[]): Load {
  return days.reduce((sum, day) => ({ allocated: sum.allocated + day.allocated, capacity: sum.capacity + day.capacity }), {
    allocated: 0,
    capacity: 0,
  });
}

export const LOAD_TEXT: Record<LoadLevel, string> = {
  off: 'text-ink-muted',
  green: 'text-ok-700',
  amber: 'text-warn-700',
  red: 'text-over-700',
};

export const LOAD_BAR: Record<LoadLevel, string> = {
  off: 'bg-line-strong',
  green: 'bg-ok-500',
  amber: 'bg-warn-500',
  red: 'bg-over-500',
};

/** Hours as a short label: 5, 2.5. */
export function formatHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}
