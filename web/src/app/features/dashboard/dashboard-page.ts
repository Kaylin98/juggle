import { Component, LOCALE_ID, computed, inject, input, linkedSignal, resource } from '@angular/core';
import { Params } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Dashboard, TeamCount } from '../../core/models';
import { ALL_TEAMS, TeamContextService } from '../../core/team-context.service';
import { addDays, formatDateRange, startOfWeek, today } from '../../shared/dates';
import { DashboardService } from './dashboard.service';
import { DepartmentPanel } from './department-panel';
import { CardLink, SummaryCard } from './summary-card';
import { UtilisationPanel } from './utilisation-panel';

/**
 * The team dashboard (ViewAllJobs): summary cards (overdue, awaiting approval, incoming, over capacity)
 * that open the filtered board, incoming or schedule, utilisation per person, and open jobs by brand. "All teams"
 * shows every team.
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [DepartmentPanel, SummaryCard, UtilisationPanel],
  template: `
    <div class="px-8 pt-2 pb-8">
      <h1 class="page-title">Dashboard</h1>
      <p class="mt-1 text-sm text-ink-muted">
        {{ teamContext.allTeams() ? 'All teams' : teamContext.team()?.name + ' team' }}
      </p>

      @if (dashboard.error()) {
        <p class="empty-state mt-6 text-over-700">The dashboard could not be loaded. Refresh the page to try again.</p>
      } @else if (data(); as data) {
        <div class="mt-6 grid grid-cols-2 gap-6 xl:grid-cols-4">
          <app-summary-card
            [label]="'Overdue ' + jobs()"
            tone="over"
            [count]="total(data.overdueJobs)"
            detail="Required before today and still open"
            [links]="overdueLinks()"
          />
          <app-summary-card
            label="Awaiting approval"
            tone="warn"
            [count]="total(data.awaitingApproval)"
            detail="Waiting for design, marketing or business approval"
            [links]="approvalLinks()"
          />
          <app-summary-card
            label="Incoming"
            tone="accent"
            [count]="total(data.incoming)"
            [detail]="briefs() + ' waiting to be reviewed or scheduled'"
            [links]="incomingLinks()"
          />
          <app-summary-card
            label="Over capacity this week"
            tone="over"
            [count]="overbooked().length"
            [detail]="overbookedDetail()"
            [links]="scheduleLink()"
          />
        </div>

        <div class="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <app-utilisation-panel
            [people]="data.people"
            [thisWeekDates]="thisWeekDates"
            [nextFourWeeksDates]="nextFourWeeksDates"
          />
          <app-department-panel [departments]="data.workByDepartment" />
        </div>
      } @else {
        <p class="empty-state mt-6">Loading the dashboard...</p>
      }
    </div>
  `,
})
export class DashboardPage {
  private readonly dashboardService = inject(DashboardService);
  private readonly locale = inject(LOCALE_ID);
  protected readonly teamContext = inject(TeamContextService);
  private readonly auth = inject(AuthService);

  /** From the `/t/:teamId/dashboard` route. */
  readonly teamId = input.required<string>();

  private readonly monday = startOfWeek(today());
  protected readonly thisWeekDates = formatDateRange(this.monday, addDays(this.monday, 4), this.locale);
  protected readonly nextFourWeeksDates = formatDateRange(addDays(this.monday, 7), addDays(this.monday, 32), this.locale);

  protected readonly dashboard = resource({
    params: () => (this.teamContext.allTeams() ? ALL_TEAMS : this.teamId()),
    loader: ({ params }) => this.dashboardService.get(params),
  });

  /** Keeps the last dashboard on screen while the next team's loads, so switching does not flash. */
  protected readonly data = linkedSignal<Dashboard | null, Dashboard | null>({
    source: () => (this.dashboard.hasValue() ? this.dashboard.value() : null),
    computation: (value, previous) => value ?? previous?.value ?? null,
  });

  protected readonly overbooked = computed(() => this.data()?.people.filter((p) => p.overThisWeek) ?? []);

  protected readonly overbookedDetail = computed(() => {
    const names = this.overbooked().map((p) => p.name);
    if (names.length === 0) return 'Everyone is within capacity this week';
    return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  });

  protected readonly scheduleLink = computed<CardLink[]>(() => [
    {
      label: 'Open the schedule',
      link: ['/t', this.teamId(), 'capacity'],
      queryParams: this.teamContext.allTeams() ? { teams: ALL_TEAMS } : undefined,
    },
  ]);

  /** The org's words, such as "jobs" and "Briefs" (D77). */
  protected readonly jobs = computed(() => `${this.auth.terms().job.toLowerCase()}s`);
  protected readonly briefs = computed(() => `${this.auth.terms().brief}s`);

  protected readonly overdueLinks = computed(() =>
    teamLinks(this.data()?.overdueJobs ?? [], this.teamContext.allTeams(), 'board', 'Show on the board', { due: 'overdue' }),
  );

  protected readonly approvalLinks = computed(() =>
    teamLinks(this.data()?.awaitingApproval ?? [], this.teamContext.allTeams(), 'board', 'Show on the board'),
  );

  /** Only users who triage briefs open the queue; the others see it on the board. */
  protected readonly incomingLinks = computed(() =>
    this.auth.can('TriageBriefs')
      ? teamLinks(this.data()?.incoming ?? [], this.teamContext.allTeams(), 'incoming', 'Open incoming')
      : teamLinks(this.data()?.incoming ?? [], this.teamContext.allTeams(), 'board', 'Show on the board'),
  );

  protected total(counts: TeamCount[]): number {
    return counts.reduce((sum, team) => sum + team.count, 0);
  }
}

/** One link to the team's page, or with "All teams" one per team, since the board and incoming are per team. */
export function teamLinks(counts: TeamCount[], allTeams: boolean, page: string, label: string, queryParams?: Params): CardLink[] {
  return allTeams
    ? counts.map((team) => ({ label: team.teamName, count: team.count, link: ['/t', team.teamId, page], queryParams }))
    : counts.map((team) => ({ label, link: ['/t', team.teamId, page], queryParams }));
}
