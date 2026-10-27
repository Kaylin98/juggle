import { Component, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { TeamContextService } from '../core/team-context.service';

@Component({
  selector: 'app-team-switcher',
  template: `
    <label class="flex items-center gap-2 text-sm">
      <span class="text-slate-500">Team</span>
      <span class="relative">
        <select
          class="cursor-pointer appearance-none rounded-md border border-slate-300 bg-white py-1.5 pr-9 pl-3 text-sm font-medium hover:border-slate-400 focus:border-accent-500 focus:ring-2 focus:ring-accent-200 focus:outline-none"
          (change)="teamContext.switchTo($any($event.target).value)"
        >
          @for (team of auth.teams(); track team.id) {
            <option [value]="team.id" [selected]="team.id === teamContext.teamId()">{{ team.name }}</option>
          }
        </select>
        <!-- Heroicons chevron-down (mini, MIT); the native arrow is hidden by appearance-none. -->
        <svg
          class="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clip-rule="evenodd"
          />
        </svg>
      </span>
    </label>
  `,
})
export class TeamSwitcher {
  protected readonly auth = inject(AuthService);
  protected readonly teamContext = inject(TeamContextService);
}
