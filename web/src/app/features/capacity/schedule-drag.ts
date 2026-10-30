import { Allocation } from '../../core/models';
import { addWeekdays } from '../../shared/dates';

/**
 * A pointer drag on the schedule. Day positions are indexes into the weekdays shown.
 * Create: across empty cells in one row. Move: a booking, to other days or another person (D34). Resize: one end.
 */
export type ScheduleDrag =
  | { kind: 'create'; personId: string; anchor: number; current: number }
  | { kind: 'move'; allocation: Allocation; personId: string; grab: number; current: number }
  | { kind: 'resize'; allocation: Allocation; edge: 'start' | 'end'; current: number };

/** The run of days a create drag covers, first to last. */
export function selectedDays(drag: Extract<ScheduleDrag, { kind: 'create' }>): { start: number; end: number } {
  return { start: Math.min(drag.anchor, drag.current), end: Math.max(drag.anchor, drag.current) };
}

/**
 * The booking as a move or resize would leave it, or null when nothing changes (it was dropped where it
 * started). A move shifts both dates by working days, so the booking keeps its length.
 * A resize sets one end to the day under the pointer, but never past the other end.
 */
export function draggedAllocation(
  drag: Exclude<ScheduleDrag, { kind: 'create' }>,
  days: string[],
): Allocation | null {
  const allocation = drag.allocation;
  if (drag.kind === 'move') {
    const shift = drag.current - drag.grab;
    if (shift === 0 && drag.personId === allocation.personId) return null;
    return {
      ...allocation,
      personId: drag.personId,
      startDate: addWeekdays(allocation.startDate, shift),
      endDate: addWeekdays(allocation.endDate, shift),
    };
  }

  const day = days[drag.current];
  const changed =
    drag.edge === 'start'
      ? { startDate: day < allocation.endDate ? day : allocation.endDate }
      : { endDate: day > allocation.startDate ? day : allocation.startDate };
  const resized = { ...allocation, ...changed };
  return resized.startDate === allocation.startDate && resized.endDate === allocation.endDate ? null : resized;
}
