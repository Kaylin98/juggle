import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Capability } from '../core/models';
import { JobsService } from '../core/jobs.service';
import { TeamContextService } from '../core/team-context.service';
import { TimeOffService } from '../core/time-off.service';
import { Nav } from './nav';

@Component({ template: '' })
class Blank {}

// The Core Group's roles, by capability only: the nav never reads a role's name (D77).
const TRAFFIC: Capability[] = ['ViewAllJobs', 'ViewBoard', 'ViewSchedule', 'ViewReports', 'TriageBriefs', 'Allocate', 'ApproveTimeOff'];
const DESIGNER: Capability[] = ['ViewBoard', 'ViewReports', 'WorkOnJobs'];
const MARKETING: Capability[] = ['SubmitBrief', 'ViewReports', 'ApproveMarketing', 'CloseJob'];

async function render(capabilities: Capability[], url: string, personId: string | null = null, teamId: string | null = 'design') {
  TestBed.configureTestingModule({
    imports: [Nav],
    providers: [
      provideRouter([{ path: '**', component: Blank }]),
      {
        provide: AuthService,
        useValue: {
          me: signal({ id: 'u1', personId }),
          can: (capability: Capability) => capabilities.includes(capability),
          terms: signal({ department: 'Brand', brief: 'Brief', job: 'Job' }),
        },
      },
      { provide: TeamContextService, useValue: { teamId: signal(teamId) } },
      { provide: JobsService, useValue: { incoming: { hasValue: () => true, value: () => [{}, {}, {}] } } },
      { provide: TimeOffService, useValue: { approvals: { hasValue: () => true, value: () => [{}, {}] } } },
    ],
  });
  await TestBed.inject(Router).navigateByUrl(url);
  const fixture = TestBed.createComponent(Nav);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const group = () => [...element.querySelectorAll('button')].find((b) => b.textContent?.includes('Requests'));
  const links = () => [...element.querySelectorAll('a')].map((a) => a.textContent!.replace(/\s+/g, ' ').trim());
  return { fixture, element, group, links };
}

describe('Nav', () => {
  beforeEach(() => localStorage.clear());

  it('shows the pages the capabilities allow, with what is waiting counted on the closed Requests group', async () => {
    const { fixture, group, links } = await render(TRAFFIC, '/t/design/board');
    expect(links()).toEqual(['Dashboard', 'Briefs report', 'Schedule', 'Board']);
    expect(group()!.getAttribute('aria-expanded')).toBe('false');
    expect(group()!.textContent).toContain('5');

    group()!.click();
    await fixture.whenStable();
    expect(links()).toEqual(['Dashboard', 'Briefs report', 'Schedule', 'Board', 'Triage 3', 'Time off 2']);
    expect(group()!.textContent).not.toContain('5');
  });

  it('gives each request page a small icon of its own, and the group a different one', async () => {
    const { element, group } = await render([...TRAFFIC, 'SubmitBrief'], '/requests');
    const path = (el: Element) => el.querySelector('svg path')!.getAttribute('d');
    const items = [...element.querySelectorAll('#nav-requests a')];

    expect(items.map((a) => a.querySelector('svg')!.classList.contains('size-4'))).toEqual([true, true, true, true]);
    expect(new Set(items.map(path)).size).toBe(4);
    expect(items.map(path)).not.toContain(path(group()!));
  });

  it('gives marketing managers their requests and a new brief, named with the organisation term, and no team pages', async () => {
    const { group, links } = await render(MARKETING, '/requests/r1', null, null);
    expect(group()!.getAttribute('aria-expanded')).toBe('true');
    expect(links()).toEqual(['My requests', 'New brief']);
  });

  it('gives designers My work and the board, and no Requests group', async () => {
    const { group, links } = await render(DESIGNER, '/t/design/board', 'p1');
    expect(links()).toEqual(['My work', 'Board']);
    expect(group()).toBeUndefined();
  });

  it('shrinks to the icon rail, remembers it for the user, and shows what is waiting as a dot', async () => {
    const { fixture, element } = await render(TRAFFIC, '/t/design/board');
    element.querySelector<HTMLButtonElement>('[aria-label="Collapse menu"]')!.click();
    await fixture.whenStable();

    expect(element.querySelector('nav')!.classList).toContain('w-16');
    expect(localStorage.getItem('juggle.nav.collapsed.u1')).toBe('true');
    const requests = element.querySelector('[aria-label="Requests"]')!;
    expect(requests.querySelector('[aria-label="5 new"]')!.textContent!.trim()).toBe('');
  });

  it('starts as the rail when the user left it that way', async () => {
    localStorage.setItem('juggle.nav.collapsed.u1', 'true');
    const { element } = await render(TRAFFIC, '/t/design/board');
    expect(element.querySelector('nav')!.classList).toContain('w-16');
  });
});
