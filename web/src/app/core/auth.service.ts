import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Capability, DemoUser, Me, Team, Terms } from './models';

const DEFAULT_TERMS: Terms = { department: 'Department', brief: 'Request', job: 'Job' };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private loading: Promise<boolean> | null = null;

  readonly me = signal<Me | null>(null);
  readonly teams = signal<Team[]>([]);

  private readonly capabilities = computed(() => new Set(this.me()?.capabilities ?? []));

  /** The organisation's words for its concepts (D48, D77), for every user-facing mention of one. */
  readonly terms = computed(() => this.me()?.terms ?? DEFAULT_TERMS);

  /** The organisation's word for a department, such as "Brand" (D48). */
  readonly departmentLabel = computed(() => this.terms().department);

  /** The name of the user's role, for display only; what they may do comes from `can` (D77). */
  readonly roleName = computed(() => this.me()?.role ?? '');

  /** The brands the user manages, whose cards awaiting approval they approve or send back (D58). */
  readonly managedDepartmentIds = computed(() => new Set(this.me()?.managedDepartmentIds ?? []));

  /** Whether the user's role allows this (D77). Reads a signal, so templates and computeds follow sign-in changes. */
  can(capability: Capability): boolean {
    return this.capabilities().has(capability);
  }

  inTeam(teamId: string): boolean {
    return this.teams().some((t) => t.id === teamId);
  }

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

  /**
   * Users who see all the work land on the dashboard, people on a schedule on My work, other board users on the
   * board (D26, D77). Anyone else, such as a marketing manager, goes to their requests.
   */
  landingUrl(): string {
    const team = this.teams()[0];
    if (team && this.can('ViewAllJobs')) return `/t/${team.id}/dashboard`;
    if (this.me()?.personId) return '/my-work';
    if (team && this.can('ViewBoard')) return `/t/${team.id}/board`;
    return '/requests';
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
