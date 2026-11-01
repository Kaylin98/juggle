import { Allocation, DayLoad } from '../../core/models';
import { clashDays, leaveDays, withBookings } from './live-load';

// Mon 2 to Fri 6 Nov 2026, 8h a day, with Wednesday on leave.
const days: DayLoad[] = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'].map((date) => ({
  date,
  capacity: date === '2026-11-04' ? 0 : 8,
  allocated: 0,
  timeOff: date === '2026-11-04' ? 'Annual leave' : null,
  publicHoliday: false,
  pendingTimeOff: null,
}));

function booking(startDate: string, endDate: string, hoursPerDay: number): Allocation {
  return {
    id: `${startDate}-${hoursPerDay}`,
    personId: 'lerato',
    jobId: 'deck',
    jobCode: 'Sales Deck',
    colour: '#5b8def',
    department: 'Sales',
    teamName: 'Design',
    startDate,
    endDate,
    hoursPerDay,
    notes: null,
    otherTeam: false,
  };
}

describe('withBookings', () => {
  it('adds up the hours booked on each working day', () => {
    const loaded = withBookings(days, [booking('2026-11-02', '2026-11-03', 4), booking('2026-11-03', '2026-11-06', 5)]);
    expect(loaded.map((d) => d.allocated)).toEqual([4, 9, 0, 5, 5]);
  });

  it('leaves days off empty, as the API does', () => {
    expect(withBookings(days, [booking('2026-11-04', '2026-11-04', 6)])[2].allocated).toBe(0);
  });
});

describe('clashDays', () => {
  it('lists the booking days that go over capacity', () => {
    const loaded = withBookings(days, [booking('2026-11-02', '2026-11-06', 6), booking('2026-11-05', '2026-11-06', 4)]);
    expect(clashDays({ startDate: '2026-11-02', endDate: '2026-11-06' }, loaded)).toEqual(['2026-11-05', '2026-11-06']);
  });

  it('only looks at the days of the booking', () => {
    const loaded = withBookings(days, [booking('2026-11-02', '2026-11-02', 10)]);
    expect(clashDays({ startDate: '2026-11-03', endDate: '2026-11-06' }, loaded)).toEqual([]);
  });
});

describe('leaveDays', () => {
  it('lists the days of a booking on leave, but not public holidays, which are everyone\'s', () => {
    const withHoliday = days.map((d) => (d.date === '2026-11-06' ? { ...d, capacity: 0, timeOff: 'Diwali', publicHoliday: true } : d));

    expect(leaveDays({ startDate: '2026-11-03', endDate: '2026-11-06' }, withHoliday)).toEqual(['2026-11-04']);
    expect(leaveDays({ startDate: '2026-11-05', endDate: '2026-11-06' }, withHoliday)).toEqual([]);
  });
});
