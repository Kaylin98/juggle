import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { ALL_TEAMS, TeamContextService } from '../core/team-context.service';
import { Select, SelectOption } from '../shared/select';

/** Picks the current team. With only one team there is nothing to pick, so it shows the team's name instead. */
@Component({
  selector: 'app-team-switcher',
  imports: [Select],
  template: `
    @if (onlyOption(); as team) {
      <div class="flex items-center gap-3">
        <span class="label-caps">Team</span>
        <span class="flex items-center gap-2 text-sm font-semibold" [style.--hue]="team.colour">
          <span class="hue-dot size-2 rounded-full"></span>
          {{ team.label }}
        </span>
      </div>
    } @else {
      <label class="flex items-center gap-3">
        <span class="label-caps">Team</span>
        <app-select variant="pill" [options]="options()" [value]="value()" (valueChange)="select($event)" />
      </label>
    }
  `,
})
export class TeamSwitcher {
  private readonly auth = inject(AuthService);
  private readonly teamContext = inject(TeamContextService);

  /** "All teams" is offered to Org Admins on the schedule and dashboard only. */
  protected readonly options = computed<SelectOption[]>(() => [
    ...(this.auth.isOrgAdmin() && this.teamContext.canShowAllTeams() ? [{ value: ALL_TEAMS, label: 'All teams' }] : []),
    ...this.auth.teams().map((team) => ({ value: team.id, label: team.name, colour: team.colour })),
  ]);

  protected readonly onlyOption = computed(() => (this.options().length === 1 ? this.options()[0] : null));

  protected readonly value = computed(() => (this.teamContext.allTeams() ? ALL_TEAMS : (this.teamContext.teamId() ?? '')));

  protected select(value: string): void {
    if (value === ALL_TEAMS) {
      this.teamContext.showAllTeams();
    } else {
      this.teamContext.switchTo(value);
    }
  }
}
