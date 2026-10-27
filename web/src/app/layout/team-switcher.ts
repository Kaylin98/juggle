import { Component, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { ALL_TEAMS, TeamContextService } from '../core/team-context.service';
import { SelectChevron } from '../shared/select-chevron';

@Component({
  selector: 'app-team-switcher',
  imports: [SelectChevron],
  template: `
    <label class="flex items-center gap-3">
      <span class="label-caps">Team</span>
      <span class="relative">
        <select class="pill-select peer" (change)="select($any($event.target).value)">
          @if (auth.isOrgAdmin() && teamContext.page() === 'capacity') {
            <option [value]="allTeams" [selected]="teamContext.allTeams()">All teams</option>
          }
          @for (team of auth.teams(); track team.id) {
            <option [value]="team.id" [selected]="!teamContext.allTeams() && team.id === teamContext.teamId()">
              {{ team.name }}
            </option>
          }
        </select>
        <app-select-chevron />
      </span>
    </label>
  `,
})
export class TeamSwitcher {
  protected readonly auth = inject(AuthService);
  protected readonly teamContext = inject(TeamContextService);
  protected readonly allTeams = ALL_TEAMS;

  protected select(value: string): void {
    if (value === ALL_TEAMS) {
      this.teamContext.showAllTeams();
    } else {
      this.teamContext.switchTo(value);
    }
  }
}
