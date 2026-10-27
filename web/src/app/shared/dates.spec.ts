import { addDays, isoWeek, startOfWeek } from './dates';

describe('dates', () => {
  it('adds days across a month end', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
  });

  it('finds the Monday of the week', () => {
    expect(startOfWeek('2026-10-27')).toBe('2026-10-26');
    expect(startOfWeek('2026-11-01')).toBe('2026-10-26');
    expect(startOfWeek('2026-10-26')).toBe('2026-10-26');
  });

  it('numbers weeks the ISO way, including at the turn of the year', () => {
    expect(isoWeek('2026-10-26')).toBe(44);
    expect(isoWeek('2026-11-01')).toBe(44);
    expect(isoWeek('2026-12-31')).toBe(53);
    expect(isoWeek('2027-01-04')).toBe(1);
  });
});
