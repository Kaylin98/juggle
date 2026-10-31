import { clashMessage } from './clash-message';

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
