import { WorkflowStatus } from '../../core/models';

// Widths in px. Keep in step with the classes in board-column.ts (min-w-60, w-14) and the board's gap-6.
const EXPANDED_MIN = 240;
const COLLAPSED = 56;
const GAP = 24;

/**
 * Which columns are collapsed for a width. Columns the viewer collapsed (`manual`) stay collapsed at any width.
 * While the columns would not fit at their minimum, the others collapse one at a time: Done-category columns
 * first, then the columns closest to Done (right to left), so To Do and the early work stay open longest. One
 * column always stays expanded. A width of 0 means not measured yet, so nothing collapses automatically.
 * While a filter is on, the columns it leaves empty (`empty`) collapse before the rest, so the matches stay in view.
 */
export function collapsedColumns(
  statuses: WorkflowStatus[],
  manual: ReadonlySet<string>,
  width: number,
  empty: ReadonlySet<string> = new Set(),
): Set<string> {
  const collapsed = new Set(statuses.filter((s) => manual.has(s.id)).map((s) => s.id));
  if (width <= 0) return collapsed;

  const needed = () =>
    statuses.reduce((sum, s) => sum + (collapsed.has(s.id) ? COLLAPSED : EXPANDED_MIN), 0) +
    GAP * Math.max(0, statuses.length - 1);

  for (const status of collapseOrder(statuses.filter((s) => !collapsed.has(s.id)), empty)) {
    if (needed() <= width || collapsed.size >= statuses.length - 1) break;
    collapsed.add(status.id);
  }
  return collapsed;
}

/**
 * The viewer collapses or expands one column. Every other column keeps its current state (the board scrolls if
 * they no longer fit). A collapse is added to the viewer's own collapsed columns; an expand removes it from them,
 * so it is not kept: the automatic rules may collapse that column again after the next resize.
 */
export function toggleColumn(
  collapsed: ReadonlySet<string>,
  manual: ReadonlySet<string>,
  statusId: string,
): { collapsed: Set<string>; manual: Set<string> } {
  const next = { collapsed: new Set(collapsed), manual: new Set(manual) };
  if (collapsed.has(statusId)) {
    next.collapsed.delete(statusId);
    next.manual.delete(statusId);
  } else {
    next.collapsed.add(statusId);
    next.manual.add(statusId);
  }
  return next;
}

/**
 * A card dropped on a collapsed column opens that column, so the card stays in view. Like a manual expand it holds
 * only until the next resize or page load; the viewer's saved collapsed columns are not changed.
 */
export function expandOnDrop(collapsed: ReadonlySet<string>, statusId: string): Set<string> {
  const next = new Set(collapsed);
  next.delete(statusId);
  return next;
}

/** Empty columns first, then Done-category columns from the right, then the rest from the right. */
function collapseOrder(statuses: WorkflowStatus[], empty: ReadonlySet<string>): WorkflowStatus[] {
  const fromRight = [...statuses].reverse();
  const order = [...fromRight.filter((s) => s.category === 'Done'), ...fromRight.filter((s) => s.category !== 'Done')];
  return [...order.filter((s) => empty.has(s.id)), ...order.filter((s) => !empty.has(s.id))];
}
