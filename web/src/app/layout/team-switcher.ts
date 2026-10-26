import { Component, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { TeamContextService } from '../core/team-context.service';

@Component({
  selector: 'app-team-switcher',
  template: `
    <label class="flex items-center gap-2 text-sm">
      <span class="text-slate-500">Team</span>
      <select
        class="rounded-md border border-slate-300 bg-white py-1.5 pr-8 pl-3 text-sm font-medium focus:border-accent-500 focus:ring-2 focus:ring-accent-200 focus:outline-none"
        (change)="teamContext.switchTo($any($event.target).value)"
      >
        @for (team of auth.teams(); track team.id) {
          <option [value]="team.id" [selected]="team.id === teamContext.teamId()">{{ team.name }}</option>
        }
      </select>
    </label>
  `,
})
export class TeamSwitcher {
  protected readonly auth = inject(AuthService);
  protected readonly teamContext = inject(TeamContextService);
}
