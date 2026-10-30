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

  it('keeps collapsing as the width shrinks: Done columns, then right to left', () => {
    expect(ids(collapsedColumns(statuses, none, 1111))).toEqual(['published', 'scheduled']);
    expect(ids(collapsedColumns(statuses, none, 927))).toEqual(['published', 'scheduled', 'review']);
    expect(ids(collapsedColumns(statuses, none, 743))).toEqual(['published', 'scheduled', 'review', 'writing']);
  });

  it('always leaves the first column expanded', () => {
    expect(ids(collapsedColumns(statuses, none, 300))).toEqual(['published', 'scheduled', 'review', 'writing']);
  });

  it('collapses Done first even when it is not the last column', () => {
    const doneInMiddle = [status('todo', 'Todo'), status('done', 'Done'), status('later', 'Todo')];
    // Expanded: 3 x 240 + 2 x 24 = 768px.
    expect(ids(collapsedColumns(doneInMiddle, none, 767))).toEqual(['done']);
  });

  it('keeps To Do open on the Design board at 1440px', () => {
    // Design without Triage. A 1440px window leaves 1136px for the board (240px nav, 32px padding each side).
    const design = [
      status('todo', 'Todo'),
      status('in-design', 'InProgress'),
      status('internal-review', 'Review'),
      status('with-requester', 'Review'),
      status('changes', 'InProgress'),
      status('done', 'Done'),
    ];
    expect(ids(collapsedColumns(design, none, 1136))).toEqual(['done', 'changes', 'with-requester']);
  });

  it('keeps a column the viewer collapsed collapsed at any width', () => {
    expect(ids(collapsedColumns(statuses, set('writing'), 5000))).toEqual(['writing']);
  });

  it('counts columns the viewer collapsed when checking the fit', () => {
    // Writing collapsed: 4 x 240 + 56 + 4 x 24 = 1112px.
    expect(ids(collapsedColumns(statuses, set('writing'), 1112))).toEqual(['writing']);
    expect(ids(collapsedColumns(statuses, set('writing'), 1111))).toEqual(['writing', 'published']);
  });

  it('collapses the columns a filter leaves empty first, then the usual order', () => {
    const empty = set('planned', 'writing', 'scheduled');
    expect(ids(collapsedColumns(statuses, none, 1111, empty))).toEqual(['scheduled', 'writing']);
    expect(ids(collapsedColumns(statuses, none, 743, empty))).toEqual(['scheduled', 'writing', 'planned', 'published']);
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
