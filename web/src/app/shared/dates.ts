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
