import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { Me, TeamRole } from './models';
import { TeamContextService } from './team-context.service';

@Component({ template: '' })
class BlankPage {}

const ORG_ADMIN: Me = { id: 'u1', name: 'Naledi', email: 'naledi@example.com', avatarColour: '#8a78d6', orgRole: 'OrgAdmin', personId: 'p1', departmentLabel: 'Department' };

describe('TeamContextService.switchTo', () => {
  let router: Router;
  let teamContext: TeamContextService;

  function setUp(designRole: TeamRole, marketingRole: TeamRole): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 't/:teamId/:page', component: BlankPage }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(AuthService).teams.set([
      { id: 'design', name: 'Design', colour: '#7c3aed', myRole: designRole },
      { id: 'marketing', name: 'Marketing', colour: '#0284c7', myRole: marketingRole },
    ]);
    router = TestBed.inject(Router);
    teamContext = TestBed.inject(TeamContextService);
  }

  async function switchTeam(fromUrl: string, toTeamId: string): Promise<string> {
    await router.navigateByUrl(fromUrl);
    teamContext.switchTo(toTeamId);
    await vi.waitFor(() => expect(router.url).toContain(`/t/${toTeamId}/`));
    return router.url;
  }

  it('keeps a member on the capacity page and only changes the team', async () => {
    setUp('Member', 'Member');
    expect(await switchTeam('/t/design/capacity', 'marketing')).toBe('/t/marketing/capacity');
  });

  it('keeps a member on the board', async () => {
    setUp('Member', 'Member');
    expect(await switchTeam('/t/design/board', 'marketing')).toBe('/t/marketing/board');
  });

  it('keeps a team admin on an admin-only page', async () => {
    setUp('TeamAdmin', 'TeamAdmin');
    expect(await switchTeam('/t/design/dashboard', 'marketing')).toBe('/t/marketing/dashboard');
  });

  it('falls back to the board when the user cannot open the page in the new team', async () => {
    setUp('TeamAdmin', 'Member');
    expect(await switchTeam('/t/design/triage', 'marketing')).toBe('/t/marketing/board');
  });
});

describe('TeamContextService.showAllTeams', () => {
  it('shows every team on the schedule until a team is picked', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 't/:teamId/:page', component: BlankPage }]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(AuthService).me.set(ORG_ADMIN);
    TestBed.inject(AuthService).teams.set([
      { id: 'design', name: 'Design', colour: '#7c3aed', myRole: 'TeamAdmin' },
      { id: 'marketing', name: 'Marketing', colour: '#0284c7', myRole: 'TeamAdmin' },
    ]);
    const router = TestBed.inject(Router);
    const teamContext = TestBed.inject(TeamContextService);
    await router.navigateByUrl('/t/design/capacity');

    teamContext.showAllTeams();
    await vi.waitFor(() => expect(router.url).toBe('/t/design/capacity?teams=all'));
    expect(teamContext.allTeams()).toBe(true);

    teamContext.switchTo('marketing');
    await vi.waitFor(() => expect(router.url).toBe('/t/marketing/capacity'));
    expect(teamContext.allTeams()).toBe(false);
  });
});

describe('TeamContextService on the dashboard', () => {
  it('shows every team on the dashboard, and keeps the dashboard when a team is picked', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 't/:teamId/:page', component: BlankPage }]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(AuthService).me.set(ORG_ADMIN);
    TestBed.inject(AuthService).teams.set([
      { id: 'design', name: 'Design', colour: '#7c3aed', myRole: 'TeamAdmin' },
      { id: 'marketing', name: 'Marketing', colour: '#0284c7', myRole: 'TeamAdmin' },
    ]);
    const router = TestBed.inject(Router);
    const teamContext = TestBed.inject(TeamContextService);
    await router.navigateByUrl('/t/design/dashboard');

    teamContext.showAllTeams();
    await vi.waitFor(() => expect(router.url).toBe('/t/design/dashboard?teams=all'));
    expect(teamContext.allTeams()).toBe(true);

    teamContext.switchTo('marketing');
    await vi.waitFor(() => expect(router.url).toBe('/t/marketing/dashboard'));
    expect(teamContext.allTeams()).toBe(false);
  });

  it('does not offer every team on the board', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 't/:teamId/:page', component: BlankPage }]), provideHttpClient(), provideHttpClientTesting()] });
    await TestBed.inject(Router).navigateByUrl('/t/design/board?teams=all');
    const teamContext = TestBed.inject(TeamContextService);
    expect(teamContext.canShowAllTeams()).toBe(false);
    expect(teamContext.allTeams()).toBe(false);
  });
});

describe('TeamContextService for a Member', () => {
  it('ignores ?teams=all, since only Org Admins can see every team', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 't/:teamId/:page', component: BlankPage }]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(AuthService).me.set({ ...ORG_ADMIN, orgRole: 'User' });
    TestBed.inject(AuthService).teams.set([{ id: 'design', name: 'Design', colour: '#7c3aed', myRole: 'Member' }]);
    await TestBed.inject(Router).navigateByUrl('/t/design/capacity?teams=all');

    expect(TestBed.inject(TeamContextService).allTeams()).toBe(false);
  });
});
