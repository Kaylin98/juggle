import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { TeamRole } from './models';
import { TeamContextService } from './team-context.service';

@Component({ template: '' })
class BlankPage {}

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
