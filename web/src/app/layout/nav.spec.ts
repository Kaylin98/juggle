import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { RequestsService } from '../core/requests.service';
import { TeamContextService } from '../core/team-context.service';
import { Nav } from './nav';

@Component({ template: '' })
class Blank {}

async function render(role: 'TeamAdmin' | 'Member', url: string) {
  TestBed.configureTestingModule({
    imports: [Nav],
    providers: [
      provideRouter([{ path: '**', component: Blank }]),
      { provide: AuthService, useValue: { me: signal({ id: 'u1' }), roleIn: () => role } },
      { provide: TeamContextService, useValue: { teamId: signal('design') } },
      { provide: RequestsService, useValue: { inbox: { hasValue: () => true, value: () => [{}, {}, {}] } } },
    ],
  });
  await TestBed.inject(Router).navigateByUrl(url);
  const fixture = TestBed.createComponent(Nav);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const group = () => [...element.querySelectorAll('button')].find((b) => b.textContent?.includes('Requests'))!;
  const links = () => [...element.querySelectorAll('a')].map((a) => a.textContent!.replace(/\s+/g, ' ').trim());
  return { fixture, element, group, links };
}

describe('Nav', () => {
  beforeEach(() => localStorage.clear());

  it('groups the request pages under Requests, closed away from them, with the triage count on the group', async () => {
    const { fixture, group, links } = await render('TeamAdmin', '/t/design/board');
    expect(links()).toEqual(['Dashboard', 'Schedule', 'Board']);
    expect(group().getAttribute('aria-expanded')).toBe('false');
    expect(group().textContent).toContain('3');

    group().click();
    await fixture.whenStable();
    expect(links()).toEqual(['Dashboard', 'Schedule', 'Board', 'Triage 3', 'My requests', 'New request']);
    expect(group().textContent).not.toContain('3');
  });

  it('gives each request page a small icon of its own, and the group a different one', async () => {
    const { element, group } = await render('TeamAdmin', '/requests');
    const path = (el: Element) => el.querySelector('svg path')!.getAttribute('d');
    const items = [...element.querySelectorAll('#nav-requests a')];

    expect(items.map((a) => a.querySelector('svg')!.classList.contains('size-4'))).toEqual([true, true, true]);
    expect(new Set(items.map(path)).size).toBe(3);
    expect(items.map(path)).not.toContain(path(group()));
  });

  it('opens the group on one of its pages', async () => {
    const { group } = await render('TeamAdmin', '/requests/r1');
    expect(group().getAttribute('aria-expanded')).toBe('true');
  });

  it('shows Members no Dashboard and no Triage', async () => {
    const { fixture, group, links } = await render('Member', '/request');
    await fixture.whenStable();
    expect(group().textContent).not.toContain('3');
    expect(links()).toEqual(['Schedule', 'Board', 'My requests', 'New request']);
  });

  it('shrinks to the icon rail, remembers it for the user, and shows the triage count as a dot', async () => {
    const { fixture, element } = await render('TeamAdmin', '/t/design/board');
    element.querySelector<HTMLButtonElement>('[aria-label="Collapse menu"]')!.click();
    await fixture.whenStable();

    expect(element.querySelector('nav')!.classList).toContain('w-16');
    expect(localStorage.getItem('juggle.nav.collapsed.u1')).toBe('true');
    const requests = element.querySelector('[aria-label="Requests"]')!;
    expect(requests.querySelector('[aria-label="3 new"]')!.textContent!.trim()).toBe('');
  });

  it('starts as the rail when the user left it that way', async () => {
    localStorage.setItem('juggle.nav.collapsed.u1', 'true');
    const { element } = await render('TeamAdmin', '/t/design/board');
    expect(element.querySelector('nav')!.classList).toContain('w-16');
  });
});
