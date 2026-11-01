import { ColumnCount } from '../../core/models';

/**
 * Column colours in board order: open columns grey, blue, amber, then darker amber (to do, in progress, in review,
 * waiting on others), then darker blue; done columns green, then darker green. The Core Group's five columns take the
 * same five colours, in the same order, as the studio's earlier board, which the dataviz validator checked for
 * colour-blind readers.
 */
const OPEN = ['bg-ink-faint', 'bg-accent-500', 'bg-warn-500', 'bg-warn-700', 'bg-accent-700'];
const DONE = ['bg-ok-500', 'bg-ok-700'];

/** The background class for each column id. */
export function columnColours(columns: ColumnCount[]): Map<string, string> {
  let open = 0;
  let done = 0;
  return new Map(
    columns.map((column) => [
      column.columnId,
      column.done ? DONE[Math.min(done++, DONE.length - 1)] : OPEN[Math.min(open++, OPEN.length - 1)],
    ]),
  );
}
