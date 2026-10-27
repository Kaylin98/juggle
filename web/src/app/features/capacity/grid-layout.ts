import { Allocation, DayLoad } from '../../core/models';

/** Weekdays in a week. The grid adds one narrow weekend column after each week. */
const WORKDAYS = 5;

/** A piece of a booking on the grid: first and last weekday (0-based index into the days shown) and its lane. */
export interface PlacedBar {
  allocation: Allocation;
  start: number;
  end: number;
  lane: number;
}

/** Days off with the same reason, cut at weekends. From and to are the dates of the whole run, for the label. */
export interface TimeOffBlock {
  start: number;
  end: number;
  label: string;
  from: string;
  to: string;
}

type Run = [start: number, end: number];

/** The timeline column (0-based) of a weekday: five day columns, then a weekend column, per week. */
export function dayColumn(index: number): number {
  return Math.floor(index / WORKDAYS) * (WORKDAYS + 1) + (index % WORKDAYS);
}

/** Cuts a run of weekdays wherever a week ends. */
function splitAtWeekends([start, end]: Run): Run[] {
  const runs: Run[] = [];
  for (let from = start; from <= end; from = (Math.floor(from / WORKDAYS) + 1) * WORKDAYS) {
    runs.push([from, Math.min(end, Math.floor(from / WORKDAYS) * WORKDAYS + WORKDAYS - 1)]);
  }
  return runs;
}

/** The runs of consecutive days in a range that pass the test. */
function runsWhere(days: DayLoad[], [start, end]: Run, test: (day: DayLoad) => boolean): Run[] {
  const runs: Run[] = [];
  for (let i = start; i <= end; i++) {
    if (!test(days[i])) continue;
    const last = runs.at(-1);
    if (last && last[1] === i - 1) last[1] = i;
    else runs.push([i, i]);
  }
  return runs;
}

/**
 * Places bookings on the days shown. A booking keeps one lane (first fit) across its whole span, so it is easy
 * to follow, and is drawn as one piece per run of working days: it splits at weekends and at days off.
 */
export function placeBars(allocations: Allocation[], days: DayLoad[]): PlacedBar[] {
  const laneEnds: number[] = [];
  return allocations
    .map((allocation) => {
      const span: Run = [
        days.findIndex((d) => d.date >= allocation.startDate),
        // Days are in order, so the last visible day is the count of days up to the end date, less one.
        days.filter((d) => d.date <= allocation.endDate).length - 1,
      ];
      const runs = span[0] === -1 ? [] : runsWhere(days, span, (day) => day.capacity > 0).flatMap(splitAtWeekends);
      return { allocation, runs };
    })
    .filter((booking) => booking.runs.length > 0)
    .sort((a, b) => a.runs[0][0] - b.runs[0][0] || b.runs.at(-1)![1] - a.runs.at(-1)![1])
    .flatMap(({ allocation, runs }) => {
      let lane = laneEnds.findIndex((end) => end < runs[0][0]);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = runs.at(-1)![1];
      return runs.map(([start, end]) => ({ allocation, start, end, lane }));
    });
}

export function timeOffBlocks(days: DayLoad[]): TimeOffBlock[] {
  const runs: { run: Run; label: string }[] = [];
  days.forEach((day, i) => {
    if (!day.timeOff) return;
    const last = runs.at(-1);
    if (last && last.run[1] === i - 1 && last.label === day.timeOff) last.run[1] = i;
    else runs.push({ run: [i, i], label: day.timeOff });
  });
  return runs.flatMap(({ run, label }) =>
    splitAtWeekends(run).map(([start, end]) => ({ start, end, label, from: days[run[0]].date, to: days[run[1]].date })),
  );
}
