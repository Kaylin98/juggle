import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TeamContextService } from '../core/team-context.service';

/** Stands in for pages built in later phases. */
@Component({
  selector: 'app-placeholder-page',
  template: `
    <div class="p-8">
      <h1 class="text-xl font-semibold">{{ title }}</h1>
      @if (teamContext.team(); as team) {
        <p class="mt-1 text-sm text-slate-500">{{ team.name }} team</p>
      }
      <p class="mt-6 text-sm text-slate-500">This page is built in a later phase.</p>
    </div>
  `,
})
export class PlaceholderPage {
  protected readonly teamContext = inject(TeamContextService);
  protected readonly title = inject(ActivatedRoute).snapshot.title;
}
