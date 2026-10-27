import { BoardPrefsService } from './board-prefs.service';

describe('BoardPrefsService', () => {
  const prefs = new BoardPrefsService();

  beforeEach(() => localStorage.clear());

  it('has no choices until the viewer makes one', () => {
    expect(prefs.columnOverrides('design')).toEqual({});
  });

  it('remembers the choices per team', () => {
    prefs.saveColumnOverrides('design', { done: false, todo: true });

    expect(prefs.columnOverrides('design')).toEqual({ done: false, todo: true });
    expect(prefs.columnOverrides('marketing')).toEqual({});
  });
});
