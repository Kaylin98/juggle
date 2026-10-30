import { formatDate } from '@angular/common';

/** Up to this many clash days are named; more are counted. */
const NAMED_DAYS = 3;

/** Clash days in words: "Mon 2 Nov and Tue 3 Nov", or "4 days, from Mon 2 Nov" when there are many. */
export function clashDaysText(clashDays: string[], locale: string): string {
  const days = clashDays.map((d) => formatDate(d, 'EEE d MMM', locale));
  if (days.length > NAMED_DAYS) return `${days.length} days, from ${days[0]}`;
  return days.length === 1 ? days[0] : `${days.slice(0, -1).join(', ')} and ${days.at(-1)}`;
}

/** The warning after a booking pushes someone over capacity (D16), or null when it did not. */
export function clashMessage(personName: string, clashDays: string[], locale: string): string | null {
  if (clashDays.length === 0) return null;
  return `Saved, but ${personName} is now over capacity on ${clashDaysText(clashDays, locale)}.`;
}
