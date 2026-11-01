import { Allocation, DayLoad } from '../../core/models';
import { PlacedBar, dayColumn, pendingTimeOffBlocks, placeBars, publicHolidays, timeOffBlocks } from './grid-layout';

// Two weeks: Mon 2 Nov to Fri 13 Nov 2026.
const dates = [
  '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06',
  '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13',
];

/** Days off by index; the indexes in publicHolidays are public holidays. */
function days(timeOff: Record<number, string> = {}, publicHolidays: number[] = []): DayLoad[] {
  return dates.map((date, i) => ({
    date,
    capacity: timeOff[i] ? 0 : 8,
    allocated: 0,
    timeOff: timeOff[i] ?? null,
    publicHoliday: publicHolidays.includes(i),
    pendingTimeOff: null,
  }));
}

function allocation(id: string, startDate: string, endDate: string): Allocation {
  return {
    id,
    personId: 'p',
    jobId: 'x',
    jobCode: id,
    colour: '#000',
    department: 'Sales',
    teamName: 'Design',
    startDate,
    endDate,
    hoursPerDay: 2,
    notes: null,
    otherTeam: false,
  };
}

const pieces = (bars: PlacedBar[]) => bars.map((b) => `${b.allocation.id}:${b.start}-${b.end}@${b.lane}`);

describe('dayColumn', () => {
  it('skips the weekend column after each week', () => {
    expect([0, 4, 5, 9].map(dayColumn)).toEqual([0, 4, 6, 10]);
  });
});

describe('placeBars', () => {
  it('clips bookings to the days shown and splits them at the weekend', () => {
    expect(pieces(placeBars([allocation('a', '2026-10-20', '2026-11-10')], days()))).toEqual(['a:0-4@0', 'a:5-6@0']);
  });

  it('marks the pieces that hold the start and the end', () => {
    const bars = placeBars([allocation('a', '2026-11-04', '2026-11-11')], days());
    expect(bars.map((b) => [b.first, b.last])).toEqual([[true, false], [false, true]]);
  });

  it('splits a booking around days off', () => {
    expect(pieces(placeBars([allocation('a', '2026-11-02', '2026-11-06')], days({ 2: 'Leave' })))).toEqual([
      'a:0-1@0',
      'a:3-4@0',
    ]);
  });

  it('stacks overlapping bookings and reuses a lane once it is free', () => {
    const bars = placeBars(
      [
        allocation('a', '2026-11-02', '2026-11-06'),
        allocation('b', '2026-11-02', '2026-11-03'),
        allocation('c', '2026-11-04', '2026-11-06'),
      ],
      days(),
    );
    expect(pieces(bars)).toEqual(['a:0-4@0', 'b:0-1@1', 'c:2-4@1']);
  });

  it('places a drop target in the lane it will take, at its full length, cut at days off', () => {
    const drop = { startDate: '2026-11-04', endDate: '2026-11-10' };
    const bars = placeBars([allocation('a', '2026-11-02', '2026-11-04'), drop], days({ 3: 'Leave' }));
    const placed = bars.filter((b) => b.allocation === drop).map((b) => `${b.start}-${b.end}@${b.lane}`);
    expect(placed).toEqual(['2-2@1', '4-4@1', '5-6@1']);
  });

  it('leaves out bookings outside the days shown or only on days off', () => {
    expect(placeBars([allocation('a', '2026-11-14', '2026-11-15')], days())).toEqual([]);
    expect(placeBars([allocation('b', '2026-11-04', '2026-11-04')], days({ 2: 'Leave' }))).toEqual([]);
  });
});

describe('timeOffBlocks', () => {
  it('merges consecutive days with the same reason, cuts them at weekends and keeps the whole range', () => {
    expect(timeOffBlocks(days({ 3: 'Leave', 4: 'Leave', 5: 'Leave', 8: 'Holiday' }))).toEqual([
      { start: 3, end: 4, label: 'Leave', from: '2026-11-05', to: '2026-11-09' },
      { start: 5, end: 5, label: 'Leave', from: '2026-11-05', to: '2026-11-09' },
      { start: 8, end: 8, label: 'Holiday', from: '2026-11-12', to: '2026-11-12' },
    ]);
  });

  it('leaves out public holidays, which the grid shows across every row', () => {
    expect(timeOffBlocks(days({ 1: 'Leave', 2: 'Heritage Day' }, [2]))).toEqual([
      { start: 1, end: 1, label: 'Leave', from: '2026-11-03', to: '2026-11-03' },
    ]);
  });
});

describe('publicHolidays', () => {
  it('names each public holiday once, even when someone is on leave that day', () => {
    const onLeave = { days: days({ 2: 'Annual leave', 7: 'Annual leave' }) };
    const atWork = { days: days({ 2: 'Heritage Day', 7: 'Reconciliation Day' }, [2, 7]) };
    expect(publicHolidays([onLeave, atWork])).toEqual([
      { index: 2, name: 'Heritage Day' },
      { index: 7, name: 'Reconciliation Day' },
    ]);
  });

  it('finds none without people', () => {
    expect(publicHolidays([])).toEqual([]);
  });
});

describe('pendingTimeOffBlocks', () => {
  it('runs pending leave together, cut at weekends, apart from approved leave', () => {
    const loads = days({ 1: 'Annual leave' }).map((day, i) => ({ ...day, pendingTimeOff: [4, 5, 6].includes(i) ? 'Study leave' : null }));

    expect(pendingTimeOffBlocks(loads)).toEqual([
      { start: 4, end: 4, label: 'Study leave', from: '2026-11-06', to: '2026-11-10' },
      { start: 5, end: 6, label: 'Study leave', from: '2026-11-06', to: '2026-11-10' },
    ]);
    expect(timeOffBlocks(loads).map((b) => b.label)).toEqual(['Annual leave']);
  });
});
