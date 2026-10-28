import { BoardPrefsService } from './board-prefs.service';

describe('BoardPrefsService', () => {
  beforeEach(() => localStorage.clear());

  it('has no collapsed columns until the user collapses one', () => {
    expect([...new BoardPrefsService().collapsedColumns('ana')]).toEqual([]);
  });

  it('remembers collapsed columns per user, as a list of ids', () => {
    const prefs = new BoardPrefsService();
    prefs.saveCollapsedColumns('ana', new Set(['done', 'todo']));

    expect([...prefs.collapsedColumns('ana')]).toEqual(['done', 'todo']);
    expect([...prefs.collapsedColumns('ben')]).toEqual([]);
    expect(localStorage.getItem('juggle.board.collapsed.ana')).toBe('["done","todo"]');
  });

  it('clears the per-team choices saved by earlier versions', () => {
    localStorage.setItem('juggle.board.columns.design', '{"done":false}');
    localStorage.setItem('juggle.board.collapsed.ana', '["done"]');

    new BoardPrefsService();

    expect(localStorage.getItem('juggle.board.columns.design')).toBeNull();
    expect(localStorage.getItem('juggle.board.collapsed.ana')).toBe('["done"]');
  });
});
