import { formatDate } from '@angular/common';

/** Up to this many clash days are named; more are counted. */
const NAMED_DAYS = 3;

/** The warning after a booking pushes someone over capacity (D16), or null when it did not. */
export function clashMessage(personName: string, clashDays: string[], locale: string): string | null {
  if (clashDays.length === 0) return null;
  const days = clashDays.map((d) => formatDate(d, 'EEE d MMM', locale));
  const when =
    days.length > NAMED_DAYS
      ? `${days.length} days, from ${days[0]}`
      : days.length === 1
        ? days[0]
        : `${days.slice(0, -1).join(', ')} and ${days.at(-1)}`;
  return `Saved, but ${personName} is now over capacity on ${when}.`;
}
