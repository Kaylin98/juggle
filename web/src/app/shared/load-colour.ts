import { DayLoad } from '../core/models';

export type LoadLevel = 'off' | 'green' | 'amber' | 'red';

/** D15: green under 80%, amber 80 to 100%, red over 100%. Days without capacity are off. */
export function loadLevel(day: DayLoad): LoadLevel {
  if (day.capacity === 0) return 'off';
  const load = day.allocated / day.capacity;
  if (load > 1) return 'red';
  return load >= 0.8 ? 'amber' : 'green';
}

export const LOAD_CLASSES: Record<LoadLevel, string> = {
  off: 'bg-slate-100 text-slate-500',
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
};

/** Hours as a short label: 5, 2.5. */
export function formatHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}
