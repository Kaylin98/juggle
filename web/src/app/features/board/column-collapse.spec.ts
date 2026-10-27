import { StatusCategory, WorkflowStatus } from '../../core/models';
import { collapsedColumns } from './column-collapse';

const status = (id: string, category: StatusCategory): WorkflowStatus => ({ id, name: id, order: 0, category });

// Marketing-like: two Done-category columns at the end. Expanded at the minimum this needs 5 x 240 + 4 x 24 = 1296px.
const statuses = [
  status('planned', 'Todo'),
  status('writing', 'InProgress'),
  status('review', 'Review'),
  status('scheduled', 'Done'),
  status('published', 'Done'),
];

const ids = (set: Set<string>) => [...set];

describe('collapsedColumns', () => {
  it('keeps every column expanded when they fit', () => {
    expect(ids(collapsedColumns(statuses, {}, 1296))).toEqual([]);
  });

  it('collapses the last Done-category column when they do not fit', () => {
    expect(ids(collapsedColumns(statuses, {}, 1295))).toEqual(['published']);
  });

  it('lets the viewer override the automatic choice either way', () => {
    expect(ids(collapsedColumns(statuses, { published: false }, 1000))).toEqual(['scheduled']);
    expect(ids(collapsedColumns(statuses, { writing: true }, 1296))).toEqual(['writing']);
  });

  it('counts columns the viewer collapsed when checking the fit', () => {
    // Writing collapsed: 4 x 240 + 56 + 4 x 24 = 1112px.
    expect(ids(collapsedColumns(statuses, { writing: true }, 1112))).toEqual(['writing']);
  });

  it('does not collapse anything before the width is measured', () => {
    expect(ids(collapsedColumns(statuses, {}, 0))).toEqual([]);
  });
});
