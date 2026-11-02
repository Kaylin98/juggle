import { formatDate } from '@angular/common';

// Dates are ISO date strings (yyyy-MM-dd), the same as the API's DateOnly.
// Arithmetic runs in UTC so daylight saving never shifts a day.

function parse(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function format(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function today(): string {
  const now = new Date();
  return format(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function addDays(date: string, days: number): string {
  const result = parse(date);
  result.setUTCDate(result.getUTCDate() + days);
  return format(result);
}

/** The Monday of the week containing the date. */
export function startOfWeek(date: string): string {
  return addDays(date, -((parse(date).getUTCDay() + 6) % 7));
}

/** The ISO 8601 week number: weeks start on Monday and week 1 holds the year's first Thursday. */
export function isoWeek(date: string): number {
  const thursday = parse(addDays(startOfWeek(date), 3));
  const firstOfYear = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return Math.floor((thursday.getTime() - firstOfYear) / 86_400_000 / 7) + 1;
}

export function isWeekend(date: string): boolean {
  return parse(date).getUTCDay() % 6 === 0;
}

/** Moves by working days (Monday to Friday), skipping weekends. A weekend date first moves to the next Monday. */
export function addWeekdays(date: string, weekdays: number): string {
  let result = date;
  while (isWeekend(result)) result = addDays(result, 1);
  const step = Math.sign(weekdays);
  for (let left = Math.abs(weekdays); left > 0; left--) {
    do result = addDays(result, step);
    while (isWeekend(result));
  }
  return result;
}

/** How many working days (Monday to Friday) fall from one date to the other, both included. */
export function weekdaysBetween(from: string, to: string): number {
  let count = 0;
  for (let day = from; day <= to; day = addDays(day, 1)) if (!isWeekend(day)) count++;
  return count;
}

/** The first working day after a date: Monday from a Friday, Saturday or Sunday. */
export function nextWeekday(date: string): string {
  return addWeekdays(addDays(date, 1), 0);
}

/** A run of days: "16 Dec", "2–6 Nov" or "30 Oct – 3 Nov". */
export function formatDateRange(from: string, to: string, locale: string): string {
  const date = (d: string, format: string) => formatDate(d, format, locale);
  if (from === to) return date(from, 'd MMM');
  return from.slice(0, 7) === to.slice(0, 7)
    ? `${date(from, 'd')}–${date(to, 'd MMM')}`
    : `${date(from, 'd MMM')} – ${date(to, 'd MMM')}`;
}

/** A real date written as yyyy-MM-dd, such as a date from the URL. */
export function isIsoDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(parse(value).getTime());
}
