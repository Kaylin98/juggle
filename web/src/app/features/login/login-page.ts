import { Component, computed, inject, resource, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DemoUser } from '../../core/models';
import { Avatar } from '../../shared/avatar';
import { BRANDING } from '../../branding';

@Component({
  selector: 'app-login-page',
  imports: [Avatar],
  templateUrl: './login-page.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly branding = BRANDING;
  protected readonly signingInAs = signal<string | null>(null);

  protected readonly users = resource({ loader: () => this.auth.demoUsers() });

  /** One group per role of the organisation, in the order the API lists them (the roles' order, D77). */
  protected readonly groups = computed(() => {
    const byRole = new Map<string, DemoUser[]>();
    for (const user of this.users.value() ?? []) {
      byRole.set(user.role, [...(byRole.get(user.role) ?? []), user]);
    }
    return [...byRole].map(([heading, users]) => ({ heading, users }));
  });

  /** Job title, or the brands the user manages, then teams. */
  protected subtitle(user: DemoUser): string {
    const detail = user.jobTitle ?? (user.departments.length ? user.departments.join(' and ') : null);
    const teams = user.teams.join(', ');
    return [detail, teams].filter((part) => part).join(' · ');
  }

  protected async signIn(user: DemoUser): Promise<void> {
    this.signingInAs.set(user.id);
    await this.auth.signIn(user.id);
    await this.router.navigateByUrl(this.auth.landingUrl());
  }
}
