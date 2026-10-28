import { Allocation, DayLoad } from '../../core/models';
import { dayColumn, placeBars, timeOffBlocks } from './grid-layout';

// Two weeks: Mon 2 Nov to Fri 13 Nov 2026.
const dates = [
  '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06',
  '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13',
];

function days(timeOff: Record<number, string> = {}): DayLoad[] {
  return dates.map((date, i) => ({ date, capacity: timeOff[i] ? 0 : 8, allocated: 0, timeOff: timeOff[i] ?? null }));
}

function allocation(id: string, startDate: string, endDate: string): Allocation {
  return {
    id,
    personId: 'p',
    projectId: 'x',
    projectName: id,
    projectColour: '#000',
    projectDepartment: 'Sales',
    teamName: 'Design',
    taskId: null,
    startDate,
    endDate,
    hoursPerDay: 2,
    notes: null,
    otherTeam: false,
  };
}

const pieces = (bars: ReturnType<typeof placeBars>) => bars.map((b) => `${b.allocation.id}:${b.start}-${b.end}@${b.lane}`);

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
});
