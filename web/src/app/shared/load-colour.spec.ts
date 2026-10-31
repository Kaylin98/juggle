import { bookedShare, dayState, loadLevel, totalLoad, utilisationLevel } from './load-colour';

const day = (allocated: number, capacity = 8) => ({ date: '2026-11-02', capacity, allocated, timeOff: null, publicHoliday: false });

describe('loadLevel', () => {
  it('is green under 80%, amber from 80% to 100%, red over 100%', () => {
    expect(loadLevel(day(6))).toBe('green');
    expect(loadLevel(day(6.4))).toBe('amber');
    expect(loadLevel(day(8))).toBe('amber');
    expect(loadLevel(day(8.5))).toBe('red');
  });

  it('is off when the day has no capacity', () => {
    expect(loadLevel(day(0, 0))).toBe('off');
  });
});

describe('utilisationLevel', () => {
  it('marks under 50% as available and keeps the load levels above it', () => {
    expect(utilisationLevel(day(3.9))).toBe('available');
    expect(utilisationLevel(day(4))).toBe('green');
    expect(utilisationLevel(day(8.5))).toBe('red');
    expect(utilisationLevel(day(0, 0))).toBe('off');
  });
});

describe('dayState', () => {
  it('is working up to capacity, over above it, off without capacity', () => {
    expect(dayState(day(8))).toBe('working');
    expect(dayState(day(9))).toBe('over');
    expect(dayState(day(0, 0))).toBe('off');
  });
});

describe('bookedShare', () => {
  it('is the booked part of the day, at most all of it', () => {
    expect(bookedShare(day(6))).toBe(0.75);
    expect(bookedShare(day(0))).toBe(0);
    expect(bookedShare(day(10))).toBe(1);
    expect(bookedShare(day(0, 0))).toBe(0);
  });
});

describe('totalLoad', () => {
  it('adds up booked and available hours, so days off lower the capacity', () => {
    expect(totalLoad([day(10), day(4), day(0, 0)])).toEqual({ allocated: 14, capacity: 16 });
  });

  it('is zero for no days', () => {
    expect(totalLoad([])).toEqual({ allocated: 0, capacity: 0 });
  });
});
