import { StatusCategory, WorkflowStatus } from '../../core/models';
import { collapsedColumns, toggleColumn } from './column-collapse';

const status = (id: string, category: StatusCategory): WorkflowStatus => ({ id, name: id, order: 0, category });

// Marketing-like: two Done-category columns at the end. Expanded at the minimum this needs 5 x 240 + 4 x 24 = 1296px.
// Each collapsed column saves 240 - 56 = 184px.
const statuses = [
  status('planned', 'Todo'),
  status('writing', 'InProgress'),
  status('review', 'Review'),
  status('scheduled', 'Done'),
  status('published', 'Done'),
];

const none = new Set<string>();
const set = (...ids: string[]) => new Set(ids);
const ids = (collapsed: Set<string>) => [...collapsed];

describe('collapsedColumns', () => {
  it('keeps every column expanded when they fit', () => {
    expect(ids(collapsedColumns(statuses, none, 1296))).toEqual([]);
  });

  it('collapses the last Done-category column first when they do not fit', () => {
    expect(ids(collapsedColumns(statuses, none, 1295))).toEqual(['published']);
  });

  it('keeps collapsing as the width shrinks: Done columns, then from the edges inward', () => {
    expect(ids(collapsedColumns(statuses, none, 1111))).toEqual(['published', 'scheduled']);
    expect(ids(collapsedColumns(statuses, none, 927))).toEqual(['published', 'scheduled', 'planned']);
    expect(ids(collapsedColumns(statuses, none, 743))).toEqual(['published', 'scheduled', 'planned', 'review']);
  });

  it('always leaves one column expanded', () => {
    expect(ids(collapsedColumns(statuses, none, 300))).toEqual(['published', 'scheduled', 'planned', 'review']);
  });

  it('keeps a column the viewer collapsed collapsed at any width', () => {
    expect(ids(collapsedColumns(statuses, set('writing'), 5000))).toEqual(['writing']);
  });

  it('counts columns the viewer collapsed when checking the fit', () => {
    // Writing collapsed: 4 x 240 + 56 + 4 x 24 = 1112px.
    expect(ids(collapsedColumns(statuses, set('writing'), 1112))).toEqual(['writing']);
    expect(ids(collapsedColumns(statuses, set('writing'), 1111))).toEqual(['writing', 'published']);
  });

  it('does not collapse anything automatically before the width is measured', () => {
    expect(ids(collapsedColumns(statuses, set('review'), 0))).toEqual(['review']);
  });
});

describe('toggleColumn', () => {
  it('collapses a column, remembers it, and leaves the others as they are', () => {
    expect(toggleColumn(set('published'), none, 'writing')).toEqual({
      collapsed: set('published', 'writing'),
      manual: set('writing'),
    });
  });

  it('expands an automatically collapsed column without collapsing another to make room', () => {
    expect(toggleColumn(set('published', 'scheduled'), none, 'published')).toEqual({
      collapsed: set('scheduled'),
      manual: none,
    });
  });

  it('forgets a column the viewer collapsed once they expand it', () => {
    expect(toggleColumn(set('writing', 'published'), set('writing'), 'writing')).toEqual({
      collapsed: set('published'),
      manual: none,
    });
  });
});
