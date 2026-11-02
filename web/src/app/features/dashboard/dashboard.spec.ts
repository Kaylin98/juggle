import { TestBed } from '@angular/core/testing';
import { PersonUtilisation, TeamCount } from '../../core/models';
import { teamLinks } from './dashboard-page';
import { UtilisationPanel } from './utilisation-panel';

describe('teamLinks', () => {
  const counts: TeamCount[] = [
    { teamId: 'design', teamName: 'Design', count: 3 },
    { teamId: 'marketing', teamName: 'Marketing', count: 1 },
  ];

  it('links the card to the team page, keeping the filter', () => {
    expect(teamLinks(counts.slice(0, 1), false, 'board', 'Show on the board', { due: 'overdue' })).toEqual([
      { label: 'Show on the board', link: ['/t', 'design', 'board'], queryParams: { due: 'overdue' } },
    ]);
  });

  it('gives each team its own line with its count on "All teams"', () => {
    expect(teamLinks(counts, true, 'incoming', 'Open incoming')).toEqual([
      { label: 'Design', count: 3, link: ['/t', 'design', 'incoming'], queryParams: undefined },
      { label: 'Marketing', count: 1, link: ['/t', 'marketing', 'incoming'], queryParams: undefined },
    ]);
  });
});

describe('UtilisationPanel', () => {
  function person(name: string, allocated: number, capacity: number, overThisWeek = false): PersonUtilisation {
    return {
      id: name,
      name,
      avatarColour: '#5b8def',
      jobTitle: 'Designer',
      thisWeek: { allocated, capacity },
      nextFourWeeks: { allocated: 80, capacity: 160 },
      overThisWeek,
    };
  }

  async function render(people: PersonUtilisation[]): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(UtilisationPanel);
    fixture.componentRef.setInput('people', people);
    fixture.componentRef.setInput('thisWeekDates', '26–30 Oct');
    fixture.componentRef.setInput('nextFourWeeksDates', '2–27 Nov');
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('lists the busiest this week first, people with no working days last', async () => {
    const element = await render([person('Amahle', 0, 0), person('Ethan', 12, 40), person('Lerato', 44, 40, true)]);
    const names = [...element.querySelectorAll('.truncate.font-semibold')].map((n) => n.textContent!.trim());
    expect(names).toEqual(['Lerato', 'Ethan', 'Amahle']);
  });

  it('shows the load in the schedule colours, with a full bar and "Overbooked" over capacity', async () => {
    const element = await render([person('Lerato', 44, 40, true), person('Ethan', 12, 40), person('Amahle', 0, 0)]);
    const meters = [...element.querySelectorAll('app-utilisation-meter')];

    expect(meters[0].textContent).toContain('110%');
    expect(meters[0].querySelector('.bg-over-500')!.getAttribute('style')).toContain('width: 100%');
    expect(element.textContent).toContain('Overbooked');
    expect(meters[2].querySelector('.text-accent-700')!.textContent).toContain('30%');
    expect(meters[4].textContent).toContain('No working days');
  });
});
