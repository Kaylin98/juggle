import { Allocation } from '../../core/models';
import { placeBars, timeOffBlocks } from './grid-layout';

const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'];

function allocation(id: string, startDate: string, endDate: string): Allocation {
  return {
    id,
    personId: 'p',
    projectId: 'x',
    projectName: id,
    projectColour: '#000',
    taskId: null,
    startDate,
    endDate,
    hoursPerDay: 2,
    notes: null,
    otherTeam: false,
  };
}

describe('placeBars', () => {
  it('clips bars to the visible days', () => {
    const [bar] = placeBars([allocation('a', '2026-10-20', '2026-11-03')], days);
    expect([bar.start, bar.end]).toEqual([0, 1]);
  });

  it('stacks overlapping bars and reuses a lane once it is free', () => {
    const bars = placeBars(
      [
        allocation('a', '2026-11-02', '2026-11-06'),
        allocation('b', '2026-11-02', '2026-11-03'),
        allocation('c', '2026-11-04', '2026-11-06'),
      ],
      days,
    );
    expect(bars.map((b) => `${b.allocation.id}:${b.lane}`)).toEqual(['a:0', 'b:1', 'c:1']);
  });

  it('leaves out bars outside the visible days', () => {
    expect(placeBars([allocation('a', '2026-11-07', '2026-11-08')], days)).toEqual([]);
  });
});

describe('timeOffBlocks', () => {
  it('merges consecutive days with the same reason', () => {
    const load = (timeOff: string | null) => ({ date: '', capacity: 0, allocated: 0, timeOff });
    const blocks = timeOffBlocks([load('Leave'), load('Leave'), load(null), load('Holiday'), load('Leave')]);
    expect(blocks).toEqual([
      { start: 0, end: 1, label: 'Leave' },
      { start: 3, end: 3, label: 'Holiday' },
      { start: 4, end: 4, label: 'Leave' },
    ]);
  });
});
