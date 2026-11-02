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

/** "Finishes Fri 27 Nov, 5 working days after Fri 20 Nov", or null when the booking finishes by the deadline. */
export function lateText(deadline: string | null, endDate: string, workingDaysLate: number, locale: string): string | null {
  if (!deadline || workingDaysLate === 0) return null;
  const date = (d: string) => formatDate(d, 'EEE d MMM', locale);
  return `Finishes ${date(endDate)}, ${workingDaysLate} working ${workingDaysLate === 1 ? 'day' : 'days'} after ${date(deadline)}`;
}

/** The live line for a booking's load: "3 days over capacity from Mon 9 Nov", or leave; null when it fits. */
export function capacityLine(clashDays: string[], leaveDays: string[], locale: string): string | null {
  const parts = [
    ...(leaveDays.length ? [`On leave on ${clashDaysText(leaveDays, locale)}`] : []),
    ...(clashDays.length
      ? [`${clashDays.length} ${clashDays.length === 1 ? 'day' : 'days'} over capacity from ${formatDate(clashDays[0], 'EEE d MMM', locale)}`]
      : []),
  ];
  return parts.length ? parts.join('. ') : null;
}

/** The toast after Allocate and schedule: what was booked, or what the booking ran into. */
export function scheduledMessage(
  name: string,
  startDate: string,
  endDate: string,
  result: { clashDays: string[]; leaveDays: string[]; afterRequiredDate: boolean },
  locale: string,
): { text: string; kind: 'success' | 'warning' } {
  const warnings = [
    clashText(result.clashDays, result.leaveDays, locale),
    result.afterRequiredDate ? 'booked past the deadline' : null,
  ].filter((w) => w !== null);
  const date = (d: string) => formatDate(d, 'EEE d MMM', locale);
  return warnings.length
    ? { text: `Scheduled, but ${name} is ${warnings.join(', and ')}.`, kind: 'warning' }
    : { text: `Scheduled ${name} from ${date(startDate)} to ${date(endDate)}.`, kind: 'success' };
}
