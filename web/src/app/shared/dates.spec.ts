import { addDays, addWeekdays, isWeekend, isoWeek, nextWeekday, startOfWeek } from './dates';

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

  it('knows Saturday and Sunday are the weekend', () => {
    expect(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'].map(isWeekend)).toEqual([false, true, true, false]);
  });

  it('moves by working days, skipping weekends in both directions', () => {
    expect(addWeekdays('2026-10-29', 2)).toBe('2026-11-02');
    expect(addWeekdays('2026-11-02', -1)).toBe('2026-10-30');
    expect(addWeekdays('2026-10-28', 0)).toBe('2026-10-28');
    expect(addWeekdays('2026-10-31', 0)).toBe('2026-11-02');
  });

  it('finds the next working day, which is Monday from a Friday or the weekend', () => {
    expect(['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'].map(nextWeekday)).toEqual([
      '2026-10-30',
      '2026-11-02',
      '2026-11-02',
      '2026-11-02',
    ]);
  });
});
