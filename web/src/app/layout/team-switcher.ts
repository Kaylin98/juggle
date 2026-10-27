import { Component, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { TeamContextService } from '../core/team-context.service';
import { SelectChevron } from '../shared/select-chevron';

@Component({
  selector: 'app-team-switcher',
  imports: [SelectChevron],
  template: `
    <label class="flex items-center gap-2 text-sm">
      <span class="text-slate-500">Team</span>
      <span class="relative">
        <select class="compact-select peer" (change)="teamContext.switchTo($any($event.target).value)">
          @for (team of auth.teams(); track team.id) {
            <option [value]="team.id" [selected]="team.id === teamContext.teamId()">{{ team.name }}</option>
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
}
