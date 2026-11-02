import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from './auth.service';
import { Capability } from './models';

const TEAM_URL = /^\/t\/([^/?#]+)(?:\/([^/?#]+))?/;

export const ALL_TEAMS = 'all';

/** What each team page needs (D77): the routes guard on it, and switching team keeps a page the role can open. */
export const TEAM_PAGES: Record<string, Capability[]> = {
  dashboard: ['ViewAllJobs'],
  briefs: ['ViewAllJobs', 'ViewReports'],
  capacity: ['ViewSchedule'],
  board: ['ViewBoard'],
  incoming: ['TriageBriefs'],
};

/** The team being viewed, taken from the `/t/:teamId/...` URL. Pages outside a team keep the last one. */
@Injectable({ providedIn: 'root' })
export class TeamContextService {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** The team page being viewed (capacity, board, ...), or null outside a team. */
  readonly page = computed(() => TEAM_URL.exec(this.url())?.[2] ?? null);

  readonly teamId = linkedSignal<{ url: string; teamIds: string[] }, string | null>({
    source: () => ({ url: this.url(), teamIds: this.auth.teams().map((t) => t.id) }),
    computation: ({ url, teamIds }, previous) => {
      const candidate = TEAM_URL.exec(url)?.[1] ?? previous?.value ?? null;
      return candidate && teamIds.includes(candidate) ? candidate : (teamIds[0] ?? null);
    },
  });

  readonly team = computed(() => this.auth.teams().find((t) => t.id === this.teamId()) ?? null);

  /** The pages that can show every team at once. */
  readonly canShowAllTeams = computed(
    () => this.page() === 'capacity' || this.page() === 'dashboard',
  );

  /**
   * Users who see all the work can show every team on the schedule and dashboard ("All teams"), kept in the URL as
   * `?teams=all`. Anyone else opening that URL sees their team, since the API refuses "all" to them.
   */
  readonly allTeams = computed(
    () =>
      this.auth.can('ViewAllJobs') &&
      this.canShowAllTeams() &&
      this.router.parseUrl(this.url()).queryParams['teams'] === ALL_TEAMS,
  );

  /** Whether the role has what the team page needs; a page not in `TEAM_PAGES` is not a team page. */
  canOpen(page: string): boolean {
    const needs = TEAM_PAGES[page];
    return needs !== undefined && needs.every((capability) => this.auth.can(capability));
  }

  showAllTeams(): void {
    void this.router.navigate(['/t', this.teamId(), this.page()], {
      queryParams: { teams: ALL_TEAMS },
    });
  }

  /** Opens the same page in another team when the role can open it there, otherwise the role's landing page. */
  switchTo(teamId: string): void {
    const current = this.page();
    if (current !== null && this.canOpen(current)) {
      void this.router.navigate(['/t', teamId, current]);
      return;
    }
    void this.router.navigate(['/t', teamId, this.canOpen('dashboard') ? 'dashboard' : 'board']);
  }
}
