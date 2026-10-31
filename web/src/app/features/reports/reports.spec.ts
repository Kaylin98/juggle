import { TestBed } from '@angular/core/testing';
import { DesignerCount, MonthCount, StatusCount } from '../../core/models';
import { DesignerChart, tickStep } from './designer-chart';
import { ReceivedChart } from './received-chart';
import { statusColours } from './status-colours';
import { StatusSplit } from './status-split';

const STATUSES: StatusCount[] = [
  { statusId: 'briefed', name: 'Briefed in', category: 'Todo', count: 2 },
  { statusId: 'working', name: 'Working on it', category: 'InProgress', count: 0 },
  { statusId: 'feedback', name: 'Feedback needed', category: 'Review', count: 1 },
  { statusId: 'approval', name: 'Awaiting approval', category: 'Review', count: 1 },
  { statusId: 'done', name: 'Done', category: 'Done', count: 4 },
];

describe('statusColours', () => {
  it('colours each status by its category, the second in a category one step darker', () => {
    expect([...statusColours(STATUSES).values()]).toEqual(['bg-ink-faint', 'bg-accent-500', 'bg-warn-500', 'bg-warn-700', 'bg-ok-500']);
  });
});

describe('tickStep', () => {
  it('picks a clean step for about four gridlines', () => {
    expect([0, 3, 9, 18, 23, 160].map(tickStep)).toEqual([1, 1, 5, 5, 10, 50]);
  });
});

describe('StatusSplit', () => {
  async function render(statuses: StatusCount[]): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(StatusSplit);
    fixture.componentRef.setInput('statuses', statuses);
    fixture.componentRef.setInput('colours', statusColours(statuses));
    fixture.componentRef.setInput('teamName', 'Studio');
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('shows the share done, a segment per status with cards, and every status in the legend', async () => {
    const element = await render(STATUSES);
    expect(element.textContent).toContain('50% Done');
    expect([...element.querySelectorAll('[role="listitem"]')].map((s) => s.getAttribute('aria-label'))).toEqual([
      'Briefed in: 2 (25%)',
      'Feedback needed: 1 (13%)',
      'Awaiting approval: 1 (13%)',
      'Done: 4 (50%)',
    ]);
    expect(element.querySelectorAll('app-status-legend li').length).toBe(5);
  });

  it('says so when there are no briefs', async () => {
    const element = await render(STATUSES.map((s) => ({ ...s, count: 0 })));
    expect(element.querySelector('.empty-state')!.textContent).toContain('No briefs yet.');
  });
});

describe('DesignerChart', () => {
  it('gives each person a column with their total, named Unassigned for cards nobody has', async () => {
    const designers: DesignerCount[] = [
      { personId: 'lerato', name: 'Lerato Mokoena', counts: { briefed: 2, done: 3 } },
      { personId: 'priya', name: 'Priya Naidoo', counts: {} },
      { personId: null, name: null, counts: { briefed: 1 } },
    ];
    const fixture = TestBed.createComponent(DesignerChart);
    fixture.componentRef.setInput('designers', designers);
    fixture.componentRef.setInput('statuses', STATUSES);
    fixture.componentRef.setInput('colours', statusColours(STATUSES));
    fixture.componentRef.setInput('teamName', 'Studio');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Studio capacity by designer');
    expect([...element.querySelectorAll('[tabindex="0"]')].map((c) => c.getAttribute('aria-label'))).toEqual([
      'Lerato Mokoena: 5 cards, Briefed in 2, Done 3',
      'Priya Naidoo: 0 cards',
      'Unassigned: 1 card, Briefed in 1',
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
