import { capacityLine, clashMessage, lateText } from './clash-message';

describe('clashMessage', () => {
  it('says nothing when nobody is over capacity or on leave', () => {
    expect(clashMessage('Lerato', [], [], 'en-US')).toBeNull();
  });

  it('names up to three days', () => {
    expect(clashMessage('Lerato', ['2026-11-03'], [], 'en-US')).toBe('Saved, but Lerato is now over capacity on Tue 3 Nov.');
    expect(clashMessage('Lerato', ['2026-11-03', '2026-11-04', '2026-11-05'], [], 'en-US')).toBe(
      'Saved, but Lerato is now over capacity on Tue 3 Nov, Wed 4 Nov and Thu 5 Nov.',
    );
  });

  it('counts more than three days', () => {
    const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'];
    expect(clashMessage('Lerato', days, [], 'en-US')).toBe('Saved, but Lerato is now over capacity on 4 days, from Mon 2 Nov.');
  });

  it('warns about leave, alone or with a clash', () => {
    expect(clashMessage('Ruben', [], ['2026-11-02'], 'en-US')).toBe('Saved, but Ruben is on leave on Mon 2 Nov.');
    expect(clashMessage('Ruben', ['2026-11-04'], ['2026-11-02', '2026-11-03'], 'en-US')).toBe(
      'Saved, but Ruben is on leave on Mon 2 Nov and Tue 3 Nov, and over capacity on Wed 4 Nov.',
    );
  });
});

describe('capacityLine', () => {
  it('counts the days over capacity from the first', () => {
    const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'];
    expect(capacityLine(days, [], 'en-US')).toBe('5 days over capacity from Mon 9 Nov');
    expect(capacityLine(days.slice(0, 1), [], 'en-US')).toBe('1 day over capacity from Mon 9 Nov');
  });

  it('adds leave, and says nothing when the booking fits', () => {
    expect(capacityLine([], ['2026-11-09'], 'en-US')).toBe('On leave on Mon 9 Nov');
    expect(capacityLine([], [], 'en-US')).toBeNull();
  });
});

describe('lateText', () => {
  it('says when it finishes and how many working days after the deadline', () => {
    expect(lateText('2026-11-20', '2026-11-27', 5, 'en-US')).toBe('Finishes Fri 27 Nov, 5 working days after Fri 20 Nov');
    expect(lateText('2026-11-20', '2026-11-23', 1, 'en-US')).toBe('Finishes Mon 23 Nov, 1 working day after Fri 20 Nov');
  });

  it('says nothing when it finishes in time or there is no deadline', () => {
    expect(lateText('2026-11-20', '2026-11-20', 0, 'en-US')).toBeNull();
    expect(lateText(null, '2026-11-20', 3, 'en-US')).toBeNull();
  });
});
