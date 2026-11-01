import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { Capability, Me, Team } from './models';
import { TeamContextService } from './team-context.service';

@Component({ template: '' })
class BlankPage {}

const TEAMS: Team[] = [
  { id: 'design', name: 'Design', colour: '#8a78d6' },
  { id: 'marketing', name: 'Marketing', colour: '#3fa7a0' },
];

const SEES_ALL: Capability[] = ['ViewAllJobs', 'ViewBoard', 'ViewSchedule', 'ViewReports', 'TriageBriefs', 'Allocate'];
const DESIGNER: Capability[] = ['ViewBoard', 'WorkOnJobs', 'ViewReports'];

function user(capabilities: Capability[]): Me {
  return {
    id: 'u1',
    name: 'Chloe',
    email: 'chloe@example.com',
    avatarColour: '#8a78d6',
    role: 'Any role name',
    capabilities,
    personId: null,
    terms: { department: 'Brand', brief: 'Brief', job: 'Job' },
    managedDepartmentIds: [],
  };
}

function setUp(capabilities: Capability[]): { router: Router; teamContext: TeamContextService } {
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: 't/:teamId/:page', component: BlankPage }]), provideHttpClient(), provideHttpClientTesting()],
  });
  TestBed.inject(AuthService).me.set(user(capabilities));
  TestBed.inject(AuthService).teams.set(TEAMS);
  return { router: TestBed.inject(Router), teamContext: TestBed.inject(TeamContextService) };
}

describe('TeamContextService.switchTo', () => {
  async function switchTeam(capabilities: Capability[], fromUrl: string): Promise<string> {
    const { router, teamContext } = setUp(capabilities);
    await router.navigateByUrl(fromUrl);
    teamContext.switchTo('marketing');
    await vi.waitFor(() => expect(router.url).toContain('/t/marketing/'));
    return router.url;
  }

  it('keeps a page the role can open and only changes the team', async () => {
    expect(await switchTeam(DESIGNER, '/t/design/board')).toBe('/t/marketing/board');
    TestBed.resetTestingModule();
    expect(await switchTeam(SEES_ALL, '/t/design/dashboard')).toBe('/t/marketing/dashboard');
  });

  it("falls back to the board when the role cannot open the page, whatever the role's name", async () => {
    expect(await switchTeam(DESIGNER, '/t/design/triage')).toBe('/t/marketing/board');
  });

  it('falls back to the dashboard for users who see all the work', async () => {
    const { router, teamContext } = setUp(SEES_ALL);
    await router.navigateByUrl('/t/design/unknown');
    teamContext.switchTo('marketing');
    await vi.waitFor(() => expect(router.url).toBe('/t/marketing/dashboard'));
  });
});

describe('TeamContextService.showAllTeams', () => {
  it('shows every team on the schedule and the dashboard until a team is picked', async () => {
    for (const page of ['capacity', 'dashboard']) {
      TestBed.resetTestingModule();
      const { router, teamContext } = setUp(SEES_ALL);
      await router.navigateByUrl(`/t/design/${page}`);

      teamContext.showAllTeams();
      await vi.waitFor(() => expect(router.url).toBe(`/t/design/${page}?teams=all`));
      expect(teamContext.allTeams()).toBe(true);

      teamContext.switchTo('marketing');
      await vi.waitFor(() => expect(router.url).toBe(`/t/marketing/${page}`));
      expect(teamContext.allTeams()).toBe(false);
    }
  });

  it('does not offer every team on the board', async () => {
    const { router, teamContext } = setUp(SEES_ALL);
    await router.navigateByUrl('/t/design/board?teams=all');
    expect(teamContext.canShowAllTeams()).toBe(false);
    expect(teamContext.allTeams()).toBe(false);
  });

  it('ignores ?teams=all without ViewAllJobs', async () => {
    const { router, teamContext } = setUp([...DESIGNER, 'ViewSchedule']);
    await router.navigateByUrl('/t/design/capacity?teams=all');
    expect(teamContext.allTeams()).toBe(false);
  });
});
