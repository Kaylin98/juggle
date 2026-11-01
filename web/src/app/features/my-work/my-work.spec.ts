import { Allocation, BoardColumn, DayLoad } from '../../core/models';
import { addDays } from '../../shared/dates';
import { job } from '../board/job.fixture';
import { groupJobs } from './my-jobs';
import { scheduleWeeks } from './my-schedule';

const MONDAY = '2026-11-02';

function day(offset: number, allocated: number, timeOff: string | null = null): DayLoad {
  return { date: addDays(MONDAY, offset), capacity: timeOff ? 0 : 8, allocated, timeOff, publicHoliday: false, pendingTimeOff: null };
}

function booking(id: string, from: number, to: number): Allocation {
  return {
    id,
    personId: 'me',
    jobId: 'p',
    jobCode: id,
    colour: '#5b8def',
    department: 'Sales',
    teamName: 'Design',
    startDate: addDays(MONDAY, from),
    endDate: addDays(MONDAY, to),
    hoursPerDay: 4,
    notes: null,
    otherTeam: false,
  };
}

describe('groupJobs', () => {
  const column = (id: string): BoardColumn => ({ id, name: id, statuses: [] });

  it('groups by board column in board order, keeping the order given (overdue first), without empty columns', () => {
    const jobs = [
      job({ id: 'Late review', columnId: 'review' }),
      job({ id: 'Late design', columnId: 'design' }),
      job({ id: 'With marketing', columnId: 'marketing' }),
      job({ id: 'Next design', columnId: 'design' }),
    ];

    const groups = groupJobs(jobs, ['incoming', 'design', 'review', 'marketing', 'done'].map(column));

    expect(groups.map((g) => g.column.id)).toEqual(['design', 'review', 'marketing']);
    expect(groups.map((g) => g.jobs.map((j) => j.id))).toEqual([['Late design', 'Next design'], ['Late review'], ['With marketing']]);
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

    const names = (w: number) => weeks[w].days.map((d) => d.bookings.map((b) => b.jobCode));
    expect(names(0)).toEqual([[], ['Deck'], [], ['Deck', 'Social'], ['Social']]);
    expect(names(1)).toEqual([['Social'], ['Social'], [], [], []]);
  });
});
