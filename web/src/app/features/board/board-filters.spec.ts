import { Task } from '../../core/models';
import { matchesFilters } from './board-filters';

function task(id: string, assigneePersonId: string | null, isOverdue: boolean): Task {
  return {
    id,
    projectId: 'p',
    statusId: 's',
    title: id,
    description: null,
    assigneePersonId,
    estimateHours: null,
    dueDate: null,
    isOverdue,
    reviewCycle: 1,
    sortOrder: 0,
    link: null,
  };
}

describe('matchesFilters', () => {
  const tasks = [task('late', 'priya', true), task('on-time', 'priya', false), task('late-other', 'sipho', true)];
  const shown = (assigneeId: string, due: string) =>
    tasks.filter((t) => matchesFilters(t, { assigneeId, projectId: '', due })).map((t) => t.id);

  it('shows every task with no filters', () => {
    expect(shown('', '')).toEqual(['late', 'on-time', 'late-other']);
  });

  it('shows only overdue tasks for "overdue", combined with the other filters', () => {
    expect(shown('', 'overdue')).toEqual(['late', 'late-other']);
    expect(shown('priya', 'overdue')).toEqual(['late']);
  });
});
