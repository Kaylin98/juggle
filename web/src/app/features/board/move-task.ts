import { Task } from '../../core/models';

/** Puts a task into a column at an index and renumbers that column, the same way the API does. */
export function moveTask(tasks: Task[], taskId: string, statusId: string, index: number): Task[] {
  const moved = tasks.find((t) => t.id === taskId)!;
  const column = columnWithout(tasks, statusId, taskId);
  column.splice(Math.min(index, column.length), 0, { ...moved, statusId });
  const renumbered = new Map(column.map((t, i) => [t.id, { ...t, sortOrder: i }]));
  return tasks.map((t) => renumbered.get(t.id) ?? t);
}

/** The tasks in a column, in board order, leaving out the task being moved. */
export function columnWithout(tasks: Task[], statusId: string, taskId: string): Task[] {
  return tasks
    .filter((t) => t.statusId === statusId && t.id !== taskId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Converts a drop index in a filtered column to an index in the full column,
 * so the task lands just before the visible card it was dropped above.
 */
export function toColumnIndex(column: Task[], visible: Task[], visibleIndex: number): number {
  if (visibleIndex < visible.length) {
    return column.findIndex((t) => t.id === visible[visibleIndex].id);
  }
  const last = visible.at(-1);
  return last ? column.findIndex((t) => t.id === last.id) + 1 : column.length;
}
