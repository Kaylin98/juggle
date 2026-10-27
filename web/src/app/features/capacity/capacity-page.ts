import { Component, inject, input, linkedSignal, resource, signal } from '@angular/core';
import { Schedule } from '../../core/models';
import { ALL_TEAMS, TeamContextService } from '../../core/team-context.service';
import { startOfWeek, today } from '../../shared/dates';
import { CapacityGrid } from './capacity-grid';
import { CapacityService, Weeks } from './capacity.service';
import { GridToolbar } from './grid-toolbar';

@Component({
  selector: 'app-capacity-page',
  imports: [CapacityGrid, GridToolbar],
  templateUrl: './capacity-page.html',
})
export class CapacityPage {
  private readonly capacityService = inject(CapacityService);
  protected readonly teamContext = inject(TeamContextService);

  /** From the `/t/:teamId/capacity` route. */
  readonly teamId = input.required<string>();

  protected readonly today = today();
  protected readonly start = signal(startOfWeek(this.today));
  protected readonly weeks = signal<Weeks>(2);

  protected readonly schedule = resource({
    params: () => ({
      teamId: this.teamContext.allTeams() ? ALL_TEAMS : this.teamId(),
      start: this.start(),
      weeks: this.weeks(),
    }),
    loader: ({ params }) => this.capacityService.get(params.teamId, params.start, params.weeks),
  });

  /** Keeps the last schedule on screen while the next one loads, so paging does not flash. */
  protected readonly data = linkedSignal<Schedule | null, Schedule | null>({
    source: () => (this.schedule.hasValue() ? this.schedule.value() : null),
    computation: (value, previous) => value ?? previous?.value ?? null,
  });
}
