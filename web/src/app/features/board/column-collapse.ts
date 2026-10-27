import { WorkflowStatus } from '../../core/models';

// Widths in px. Keep in step with the classes in board-column.ts (min-w-60, w-14) and the board's gap-6.
const EXPANDED_MIN = 240;
const COLLAPSED = 56;
const GAP = 24;

/** The viewer's own choices: status id to collapsed (true) or expanded (false). */
export type ColumnOverrides = Record<string, boolean>;

/**
 * Which columns are collapsed. The viewer's choices always win. If the columns would not fit the width
 * at their minimum, the last Done-category column the viewer has not set collapses automatically.
 * A width of 0 means not measured yet, so nothing collapses automatically.
 */
export function collapsedColumns(statuses: WorkflowStatus[], overrides: ColumnOverrides, width: number): Set<string> {
  const collapsed = new Set(statuses.filter((s) => overrides[s.id] === true).map((s) => s.id));
  const needed =
    statuses.reduce((sum, s) => sum + (collapsed.has(s.id) ? COLLAPSED : EXPANDED_MIN), 0) +
    GAP * Math.max(0, statuses.length - 1);

  if (width > 0 && needed > width) {
    const auto = [...statuses].reverse().find((s) => s.category === 'Done' && !(s.id in overrides));
    if (auto) collapsed.add(auto.id);
  }
  return collapsed;
}
