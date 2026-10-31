import { Task, TaskBooking } from '../../core/models';
import { TaskFilters, matchesFilters } from './board-filters';

const BOOKING: TaskBooking = {
  personId: 'priya',
  personName: 'Priya Naidoo',
  startDate: '2026-11-02',
  endDate: '2026-11-05',
  hoursPerDay: 4,
  hours: 16,
};

function task(id: string, assigneePersonId: string | null, isOverdue: boolean, statusId = 's', bookings: TaskBooking[] = []): Task {
  return {
    id,
    projectId: 'p',
    statusId,
    title: id,
    description: null,
    assigneePersonId,
    estimateHours: null,
    dueDate: null,
    isOverdue,
    isDueSoon: isOverdue,
    reviewCycle: 1,
    sortOrder: 0,
    link: null,
    bookedHours: bookings.reduce((sum, b) => sum + b.hours, 0),
    bookings,
  };
}

describe('matchesFilters', () => {
  const tasks = [
    task('late', 'priya', true),
    task('on-time', 'priya', false, 's', [BOOKING]),
    task('late-other', 'sipho', true),
    task('done', 'sipho', false, 'done'),
  ];
  const none: TaskFilters = { assigneeId: '', projectId: '', due: '', booking: '', doneStatusIds: new Set(['done']) };
  const shown = (filters: Partial<TaskFilters>) => tasks.filter((t) => matchesFilters(t, { ...none, ...filters })).map((t) => t.id);

  it('shows every task with no filters', () => {
    expect(shown({})).toEqual(['late', 'on-time', 'late-other', 'done']);
  });

  it('shows only overdue tasks for "overdue", combined with the other filters', () => {
    expect(shown({ due: 'overdue' })).toEqual(['late', 'late-other']);
    expect(shown({ assigneeId: 'priya', due: 'overdue' })).toEqual(['late']);
  });

  it('shows only open tasks without a booking for "Not booked"', () => {
    expect(shown({ booking: 'unbooked' })).toEqual(['late', 'late-other']);
    expect(shown({ assigneeId: 'priya', booking: 'unbooked' })).toEqual(['late']);
  });
});
