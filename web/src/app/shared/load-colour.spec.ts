import { loadLevel } from './load-colour';

describe('loadLevel', () => {
  const day = (allocated: number, capacity = 8) => ({ date: '2026-11-02', capacity, allocated, timeOff: null });

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
