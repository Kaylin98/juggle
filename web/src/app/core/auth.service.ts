import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DemoUser, Me, RoleLabel, Team, TeamRole } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private loading: Promise<boolean> | null = null;

  readonly me = signal<Me | null>(null);
  readonly teams = signal<Team[]>([]);

  readonly isOrgAdmin = computed(() => this.me()?.orgRole === 'OrgAdmin');

  readonly roleLabel = computed<RoleLabel>(() => {
    const teams = this.teams();
    if (this.isOrgAdmin()) return 'Org Admin';
    if (teams.some((t) => t.myRole === 'TeamAdmin')) return 'Team Admin';
    return teams.length > 0 ? 'Member' : 'Requester';
  });

  demoUsers(): Promise<DemoUser[]> {
    return firstValueFrom(this.http.get<DemoUser[]>('/api/auth/demo-users'));
  }

  /** Loads the signed-in user once; resolves false when nobody is signed in. */
  ensureLoaded(): Promise<boolean> {
    this.loading ??= this.load();
    return this.loading;
  }

  async signIn(userId: string): Promise<void> {
    await firstValueFrom(this.http.post<void>('/api/auth/sign-in', { userId }));
    this.loading = this.load();
    await this.loading;
  }

  async signOut(): Promise<void> {
    await firstValueFrom(this.http.post<void>('/api/auth/sign-out', {}));
    this.me.set(null);
    this.teams.set([]);
    this.loading = null;
  }

  roleIn(teamId: string): TeamRole | null {
    return this.teams().find((t) => t.id === teamId)?.myRole ?? null;
  }

  /** Admins land on the dashboard, members on My work, requesters on their requests (D26). */
  landingUrl(): string {
    const team = this.teams()[0];
    if (!team) return '/requests';
    if (team.myRole === 'TeamAdmin') return `/t/${team.id}/dashboard`;
    return this.me()?.personId ? '/my-work' : `/t/${team.id}/board`;
  }

  private async load(): Promise<boolean> {
    try {
      const [me, teams] = await Promise.all([
        firstValueFrom(this.http.get<Me>('/api/auth/me')),
        firstValueFrom(this.http.get<Team[]>('/api/teams')),
      ]);
      this.me.set(me);
      this.teams.set(teams);
      return true;
    } catch (error) {
      // 401: no cookie. 404: the cookie's user no longer exists (e.g. after a seed reset).
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 404)) {
        this.me.set(null);
        this.teams.set([]);
        return false;
      }
      throw error;
    }
  }
}
