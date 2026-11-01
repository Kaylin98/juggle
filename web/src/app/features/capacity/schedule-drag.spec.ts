import { Allocation } from '../../core/models';
import { draggedAllocation, selectedDays } from './schedule-drag';

// Two weeks of weekdays from Monday 2 November 2026.
const days = [
  '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06',
  '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13',
];

// Wednesday to Friday of the first week.
const booking: Allocation = {
  id: 'a1',
  personId: 'lerato',
  jobId: 'deck',
  jobCode: 'Sales Deck',
  colour: '#5b8def',
  department: 'Sales',
  teamName: 'Design',
  startDate: '2026-11-04',
  endDate: '2026-11-06',
  hoursPerDay: 4,
  notes: null,
  otherTeam: false,
};

const dates = (a: Allocation | null) => a && [a.personId, a.startDate, a.endDate];

describe('selectedDays', () => {
  it('runs from the first to the last day, whichever way the drag went', () => {
    expect(selectedDays({ kind: 'create', personId: 'p', anchor: 4, current: 1 })).toEqual({ start: 1, end: 4 });
  });
});

describe('draggedAllocation', () => {
  it('treats a move that ends where it started as no change', () => {
    expect(draggedAllocation({ kind: 'move', allocation: booking, personId: 'lerato', grab: 3, current: 3 }, days)).toBeNull();
  });

  it('moves by working days, keeping the length across the weekend', () => {
    const moved = draggedAllocation({ kind: 'move', allocation: booking, personId: 'lerato', grab: 2, current: 4 }, days);
    expect(dates(moved)).toEqual(['lerato', '2026-11-06', '2026-11-10']);
  });

  it('moves to another person on the same days', () => {
    const moved = draggedAllocation({ kind: 'move', allocation: booking, personId: 'ethan', grab: 2, current: 2 }, days);
    expect(dates(moved)).toEqual(['ethan', '2026-11-04', '2026-11-06']);
  });

  it('resizes either end to the day under the pointer', () => {
    expect(dates(draggedAllocation({ kind: 'resize', allocation: booking, edge: 'end', current: 6 }, days))).toEqual([
      'lerato', '2026-11-04', '2026-11-10',
    ]);
    expect(dates(draggedAllocation({ kind: 'resize', allocation: booking, edge: 'start', current: 0 }, days))).toEqual([
      'lerato', '2026-11-02', '2026-11-06',
    ]);
  });

  it('never resizes one end past the other', () => {
    expect(dates(draggedAllocation({ kind: 'resize', allocation: booking, edge: 'start', current: 7 }, days))).toEqual([
      'lerato', '2026-11-06', '2026-11-06',
    ]);
    expect(dates(draggedAllocation({ kind: 'resize', allocation: booking, edge: 'end', current: 0 }, days))).toEqual([
      'lerato', '2026-11-04', '2026-11-04',
    ]);
  });

  it('treats a resize that ends where it started as no change', () => {
    expect(draggedAllocation({ kind: 'resize', allocation: booking, edge: 'end', current: 4 }, days)).toBeNull();
  });
});
