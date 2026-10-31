import { Allocation, DayLoad, MyTask, StatusCategory } from '../../core/models';
import { addDays } from '../../shared/dates';
import { scheduleWeeks } from './my-schedule';
import { groupTasks } from './my-tasks';

function task(title: string, category: StatusCategory): MyTask {
  return {
    task: {
      id: title,
      projectId: 'p',
      statusId: 's',
      title,
      description: null,
      assigneePersonId: 'me',
      estimateHours: null,
      dueDate: null,
      isOverdue: false,
      reviewCycle: 1,
      sortOrder: 0,
      link: null,
    },
    teamId: 'design',
    teamName: 'Design',
    projectName: 'Project',
    projectColour: '#5b8def',
    projectDepartment: 'Sales',
    statusName: 'Status',
    category,
  };
}

const MONDAY = '2026-11-02';

function day(offset: number, allocated: number, timeOff: string | null = null): DayLoad {
  return { date: addDays(MONDAY, offset), capacity: timeOff ? 0 : 8, allocated, timeOff, publicHoliday: false };
}

function booking(id: string, from: number, to: number): Allocation {
  return {
    id,
    personId: 'me',
    projectId: 'p',
    projectName: id,
    projectColour: '#5b8def',
    projectDepartment: 'Sales',
    teamName: 'Design',
    taskId: null,
    startDate: addDays(MONDAY, from),
    endDate: addDays(MONDAY, to),
    hoursPerDay: 4,
    notes: null,
    otherTeam: false,
  };
}

describe('groupTasks', () => {
  it('groups by status category in board order, keeping the order given (overdue first)', () => {
    const tasks = [task('Late review', 'Review'), task('Late todo', 'Todo'), task('Doing', 'InProgress'), task('Next todo', 'Todo')];

    const groups = groupTasks(tasks);

    expect(groups.map((g) => g.label)).toEqual(['To do', 'In progress', 'Review']);
    expect(groups.map((g) => g.tasks.map((t) => t.task.title))).toEqual([['Late todo', 'Next todo'], ['Doing'], ['Late review']]);
  });
});

describe('scheduleWeeks', () => {
  // Two weeks of weekdays: Monday to Friday, then Monday to Friday again.
  const offsets = [0, 1, 2, 3, 4, 7, 8, 9, 10, 11];

  it('splits the days into this week and next, each with its utilisation', () => {
    const days = offsets.map((o, i) => day(o, i < 5 ? 8 : 2));

    const weeks = scheduleWeeks(days, [], 'en-US');

    expect(weeks.map((w) => [w.label, w.dates, w.load])).toEqual([
      ['This week', '2–6 Nov', { allocated: 40, capacity: 40 }],
      ['Next week', '9–13 Nov', { allocated: 10, capacity: 40 }],
    ]);
  });

  it('lists the bookings covering each day, but none on a day off', () => {
    const days = offsets.map((o) => day(o, 0, o === 2 ? 'Annual leave' : null));

    const weeks = scheduleWeeks(days, [booking('Deck', 1, 3), booking('Social', 3, 8)], 'en-US');

    const names = (w: number) => weeks[w].days.map((d) => d.bookings.map((b) => b.projectName));
    expect(names(0)).toEqual([[], ['Deck'], [], ['Deck', 'Social'], ['Social']]);
    expect(names(1)).toEqual([['Social'], ['Social'], [], [], []]);
  });
});
