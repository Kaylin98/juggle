import { TestBed } from '@angular/core/testing';
import { ColumnCount, DesignerCount, MonthCount } from '../../core/models';
import { columnColours } from './column-colours';
import { DesignerChart, tickStep } from './designer-chart';
import { ReceivedChart } from './received-chart';
import { StatusSplit } from './status-split';

const COLUMNS: ColumnCount[] = [
  { columnId: 'incoming', name: 'Incoming', done: false, count: 2 },
  { columnId: 'design', name: 'In Design', done: false, count: 0 },
  { columnId: 'review', name: 'In Review', done: false, count: 1 },
  { columnId: 'marketing', name: 'With Marketing', done: false, count: 1 },
  { columnId: 'done', name: 'Done', done: true, count: 4 },
];

describe('columnColours', () => {
  it('colours open columns grey, blue, amber and darker amber in order, and done columns green', () => {
    expect([...columnColours(COLUMNS).values()]).toEqual(['bg-ink-faint', 'bg-accent-500', 'bg-warn-500', 'bg-warn-700', 'bg-ok-500']);
  });
});

describe('tickStep', () => {
  it('picks a clean step for about four gridlines', () => {
    expect([0, 3, 9, 18, 23, 160].map(tickStep)).toEqual([1, 1, 5, 5, 10, 50]);
  });
});

describe('StatusSplit', () => {
  async function render(columns: ColumnCount[]): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(StatusSplit);
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('colours', columnColours(columns));
    fixture.componentRef.setInput('teamName', 'Studio');
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('shows the share done, a segment per column with jobs, and every column in the legend', async () => {
    const element = await render(COLUMNS);
    expect(element.textContent).toContain('50% Done');
    expect([...element.querySelectorAll('[role="listitem"]')].map((s) => s.getAttribute('aria-label'))).toEqual([
      'Incoming: 2 (25%)',
      'In Review: 1 (13%)',
      'With Marketing: 1 (13%)',
      'Done: 4 (50%)',
    ]);
    expect(element.querySelectorAll('app-status-legend li').length).toBe(5);
  });

  it('says so when there are no briefs', async () => {
    const element = await render(COLUMNS.map((s) => ({ ...s, count: 0 })));
    expect(element.querySelector('.empty-state')!.textContent).toContain('No briefs yet.');
  });
});

describe('DesignerChart', () => {
  it('gives each person a bar with their total, and one for the jobs with no designer yet', async () => {
    const designers: DesignerCount[] = [
      { personId: 'lerato', name: 'Lerato Mokoena', counts: { incoming: 2, done: 3 } },
      { personId: 'priya', name: 'Priya Naidoo', counts: {} },
      { personId: null, name: null, counts: { incoming: 1 } },
    ];
    const fixture = TestBed.createComponent(DesignerChart);
    fixture.componentRef.setInput('designers', designers);
    fixture.componentRef.setInput('columns', COLUMNS);
    fixture.componentRef.setInput('colours', columnColours(COLUMNS));
    fixture.componentRef.setInput('teamName', 'Studio');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Studio capacity by designer');
    expect([...element.querySelectorAll('[tabindex="0"]')].map((c) => c.getAttribute('aria-label'))).toEqual([
      'Lerato Mokoena: 5 jobs, Incoming 2, Done 3',
      'Priya Naidoo: 0 jobs',
      'No designer: 1 job, Incoming 1',
    ]);
  });
});

describe('ReceivedChart', () => {
  async function render(months: MonthCount[]): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(ReceivedChart);
    fixture.componentRef.setInput('months', months);
    fixture.componentRef.setInput('teamName', 'Studio');
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('shows a row per month with its count, the busiest month the longest bar', async () => {
    const element = await render([
      { month: '2026-09-01', count: 4 },
      { month: '2026-10-01', count: 8 },
    ]);
    expect([...element.querySelectorAll('li')].map((r) => r.getAttribute('aria-label'))).toEqual([
      'September 2026: 4 briefs received',
      'October 2026: 8 briefs received',
    ]);
    expect(element.querySelectorAll('li .bg-accent-500')[1].getAttribute('style')).toContain('width: 90%');
  });

  it('says so when nothing came in', async () => {
    const element = await render([{ month: '2026-10-01', count: 0 }]);
    expect(element.querySelector('.empty-state')!.textContent).toContain('No briefs received in the last 9 months.');
  });
});
