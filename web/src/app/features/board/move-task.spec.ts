import { Task } from '../../core/models';
import { columnWithout, moveTask, toColumnIndex } from './move-task';

function task(id: string, statusId: string, sortOrder: number): Task {
  return {
    id,
    projectId: 'p',
    statusId,
    title: id,
    description: null,
    assigneePersonId: null,
    estimateHours: null,
    dueDate: null,
    isOverdue: false,
    isDueSoon: false,
    reviewCycle: 1,
    sortOrder,
    link: null,
    bookedHours: 0,
    bookings: [],
  };
}

function column(tasks: Task[], statusId: string): string[] {
  return columnWithout(tasks, statusId, '').map((t) => `${t.id}:${t.sortOrder}`);
}

describe('moveTask', () => {
  const tasks = [task('a', 'todo', 0), task('b', 'todo', 1), task('c', 'doing', 0), task('d', 'doing', 1)];

  it('moves a task to another column at the index and renumbers it', () => {
    const result = moveTask(tasks, 'a', 'doing', 1);

    expect(column(result, 'doing')).toEqual(['c:0', 'a:1', 'd:2']);
    expect(column(result, 'todo')).toEqual(['b:1']);
  });

  it('reorders within a column', () => {
    expect(column(moveTask(tasks, 'a', 'todo', 1), 'todo')).toEqual(['b:0', 'a:1']);
  });
});

describe('toColumnIndex', () => {
  const full = [task('a', 's', 0), task('b', 's', 1), task('c', 's', 2), task('d', 's', 3)];
  const visible = [full[1], full[3]];

  it('lands before the visible card it was dropped above', () => {
    expect(toColumnIndex(full, visible, 1)).toBe(3);
  });

  it('lands after the last visible card when dropped at the end', () => {
    expect(toColumnIndex(full, visible, 2)).toBe(4);
    expect(toColumnIndex(full, [full[1]], 1)).toBe(2);
  });

  it('goes to the end of the column when nothing is visible', () => {
    expect(toColumnIndex(full, [], 0)).toBe(4);
  });
});
