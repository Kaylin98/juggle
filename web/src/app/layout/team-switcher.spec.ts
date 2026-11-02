import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../core/auth.service';
import { Team } from '../core/models';
import { TeamContextService } from '../core/team-context.service';
import { TeamSwitcher } from './team-switcher';

const design: Team = { id: 'design', name: 'Design', colour: '#8a78d6' };
const marketing: Team = { id: 'marketing', name: 'Marketing', colour: '#5b8def' };

async function render(teams: Team[]): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    imports: [TeamSwitcher],
    providers: [
      { provide: AuthService, useValue: { teams: signal(teams), can: () => false } },
      {
        provide: TeamContextService,
        useValue: {
          canShowAllTeams: signal(false),
          allTeams: signal(false),
          teamId: signal('design'),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(TeamSwitcher);
  await fixture.whenStable();
  return fixture.nativeElement;
}

describe('TeamSwitcher', () => {
  it('shows the team as text when the user has only one', async () => {
    const element = await render([design]);
    expect(element.querySelector('app-select')).toBeNull();
    expect(element.textContent).toContain('Design');
  });

  it('offers a dropdown when the user has more than one team', async () => {
    const element = await render([design, marketing]);
    expect(element.querySelector('app-select button')!.textContent).toContain('Design');
  });
});
