import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from './auth.service';

const TEAM_URL = /^\/t\/([^/?#]+)(?:\/([^/?#]+))?/;

export const ALL_TEAMS = 'all';

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

  readonly isTeamAdmin = computed(() => this.team()?.myRole === 'TeamAdmin');

  /** The pages that can show every team at once. */
  readonly canShowAllTeams = computed(() => this.page() === 'capacity' || this.page() === 'dashboard');

  /**
   * Org Admins can show every team on the schedule and dashboard ("All teams"), kept in the URL as `?teams=all`.
   * Anyone else opening that URL sees their team, since the API refuses "all" to them.
   */
  readonly allTeams = computed(
    () =>
      this.auth.isOrgAdmin() &&
      this.canShowAllTeams() &&
      this.router.parseUrl(this.url()).queryParams['teams'] === ALL_TEAMS,
  );

  showAllTeams(): void {
    void this.router.navigate(['/t', this.teamId(), this.page()], { queryParams: { teams: ALL_TEAMS } });
  }

  /** Opens the same page in another team, falling back to the role's landing page (dashboard or board). */
  switchTo(teamId: string): void {
    const isAdmin = this.auth.roleIn(teamId) === 'TeamAdmin';
    const current = this.page();
    const allowed = current !== null && (isAdmin || current === 'board' || current === 'capacity');
    const page = allowed ? current : isAdmin ? 'dashboard' : 'board';
    void this.router.navigate(['/t', teamId, page]);
  }
}
