import { Allocation, DayLoad } from '../../core/models';

/** An allocation placed on the grid: first and last visible day column (0-based) and its lane. */
export interface PlacedBar {
  allocation: Allocation;
  start: number;
  end: number;
  lane: number;
}

/** A run of consecutive days off with the same reason, drawn as one hatched block. */
export interface TimeOffBlock {
  start: number;
  end: number;
  label: string;
}

/** Clips allocations to the visible days and stacks overlapping ones in lanes, first fit. */
export function placeBars(allocations: Allocation[], days: string[]): PlacedBar[] {
  const laneEnds: number[] = [];
  return allocations
    .map((allocation) => ({
      allocation,
      start: days.findIndex((d) => d >= allocation.startDate),
      // Days are in order, so the last visible day is the count of days up to the end date, less one.
      end: days.filter((d) => d <= allocation.endDate).length - 1,
    }))
    .filter((bar) => bar.start !== -1 && bar.end >= bar.start)
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .map((bar) => {
      let lane = laneEnds.findIndex((end) => end < bar.start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = bar.end;
      return { ...bar, lane };
    });
}

export function timeOffBlocks(days: DayLoad[]): TimeOffBlock[] {
  const blocks: TimeOffBlock[] = [];
  days.forEach((day, i) => {
    if (!day.timeOff) return;
    const last = blocks.at(-1);
    if (last && last.end === i - 1 && last.label === day.timeOff) {
      last.end = i;
    } else {
      blocks.push({ start: i, end: i, label: day.timeOff });
    }
  });
  return blocks;
}
