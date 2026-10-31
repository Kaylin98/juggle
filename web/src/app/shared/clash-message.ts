import { formatDate } from '@angular/common';

/** Up to this many clash days are named; more are counted. */
const NAMED_DAYS = 3;

/** Clash days in words: "Mon 2 Nov and Tue 3 Nov", or "4 days, from Mon 2 Nov" when there are many. */
export function clashDaysText(clashDays: string[], locale: string): string {
  const days = clashDays.map((d) => formatDate(d, 'EEE d MMM', locale));
  if (days.length > NAMED_DAYS) return `${days.length} days, from ${days[0]}`;
  return days.length === 1 ? days[0] : `${days.slice(0, -1).join(', ')} and ${days.at(-1)}`;
}

/** What a booking runs into: "on leave on Mon 2 Nov", "over capacity on Tue 3 Nov", or both; null when nothing. */
export function clashText(clashDays: string[], leaveDays: string[], locale: string): string | null {
  const parts = [
    ...(leaveDays.length ? [`on leave on ${clashDaysText(leaveDays, locale)}`] : []),
    ...(clashDays.length ? [`over capacity on ${clashDaysText(clashDays, locale)}`] : []),
  ];
  return parts.length ? parts.join(', and ') : null;
}

/** The warning after a booking pushes someone over capacity (D16) or lands on their leave, or null when neither. */
export function clashMessage(personName: string, clashDays: string[], leaveDays: string[], locale: string): string | null {
  const text = clashText(clashDays, leaveDays, locale);
  if (!text) return null;
  return `Saved, but ${personName} is ${leaveDays.length ? '' : 'now '}${text}.`;
}
