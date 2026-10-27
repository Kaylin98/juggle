import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { ALL_TEAMS, TeamContextService } from '../core/team-context.service';
import { Select, SelectOption } from '../shared/select';

@Component({
  selector: 'app-team-switcher',
  imports: [Select],
  template: `
    <label class="flex items-center gap-3">
      <span class="label-caps">Team</span>
      <app-select variant="pill" [options]="options()" [value]="value()" (valueChange)="select($event)" />
    </label>
  `,
})
export class TeamSwitcher {
  private readonly auth = inject(AuthService);
  private readonly teamContext = inject(TeamContextService);

  /** "All teams" is offered to Org Admins on the schedule only. */
  protected readonly options = computed<SelectOption[]>(() => [
    ...(this.auth.isOrgAdmin() && this.teamContext.page() === 'capacity' ? [{ value: ALL_TEAMS, label: 'All teams' }] : []),
    ...this.auth.teams().map((team) => ({ value: team.id, label: team.name, colour: team.colour })),
  ]);

  protected readonly value = computed(() => (this.teamContext.allTeams() ? ALL_TEAMS : (this.teamContext.teamId() ?? '')));

  protected select(value: string): void {
    if (value === ALL_TEAMS) {
      this.teamContext.showAllTeams();
    } else {
      this.teamContext.switchTo(value);
    }
  }
}
