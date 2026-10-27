import { loadLevel, totalLoad } from './load-colour';

const day = (allocated: number, capacity = 8) => ({ date: '2026-11-02', capacity, allocated, timeOff: null });

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

describe('totalLoad', () => {
  it('adds up booked and available hours, so days off lower the capacity', () => {
    expect(totalLoad([day(10), day(4), day(0, 0)])).toEqual({ allocated: 14, capacity: 16 });
  });

  it('is zero for no days', () => {
    expect(totalLoad([])).toEqual({ allocated: 0, capacity: 0 });
  });
});
