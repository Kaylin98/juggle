import { Component, computed, inject, resource, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DemoUser, RoleLabel } from '../../core/models';
import { Avatar } from '../../shared/avatar';
import { BRANDING } from '../../branding';

const GROUPS: { role: RoleLabel; heading: string }[] = [
  { role: 'Org Admin', heading: 'Org Admin' },
  { role: 'Team Admin', heading: 'Team Admins' },
  { role: 'Member', heading: 'Members' },
];

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

  protected readonly groups = computed(() =>
    GROUPS.map((group) => ({
      heading: group.heading,
      users: (this.users.value() ?? []).filter((u) => u.role === group.role),
    })).filter((group) => group.users.length > 0),
  );

  /** Job title, or the brands a marketing manager covers, then teams. */
  protected subtitle(user: DemoUser): string {
    const detail = user.jobTitle ?? (user.departments.length ? `Marketing manager, ${user.departments.join(' and ')}` : null);
    const teams = user.teams.join(', ');
    return [detail, teams].filter((part) => part).join(' · ');
  }

  protected async signIn(user: DemoUser): Promise<void> {
    this.signingInAs.set(user.id);
    await this.auth.signIn(user.id);
    await this.router.navigateByUrl(this.auth.landingUrl());
  }
}
