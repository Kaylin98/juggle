import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TeamContextService } from '../core/team-context.service';

/** Stands in for pages built in later phases. */
@Component({
  selector: 'app-placeholder-page',
  template: `
    <div class="px-8 pt-2 pb-8">
      <h1 class="page-title">{{ title }}</h1>
      @if (teamContext.team(); as team) {
        <p class="mt-1 text-sm text-ink-muted">{{ team.name }} team</p>
      }
      <p class="empty-state mt-6">This page is built in a later phase.</p>
    </div>
  `,
})
export class PlaceholderPage {
  protected readonly teamContext = inject(TeamContextService);
  protected readonly title = inject(ActivatedRoute).snapshot.title;
}
