import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { TeamContextService } from '../core/team-context.service';
import { Avatar } from '../shared/avatar';
import { TeamSwitcher } from './team-switcher';

@Component({
  selector: 'app-header',
  imports: [Avatar, TeamSwitcher],
  templateUrl: './header.html',
})
export class Header {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly teamContext = inject(TeamContextService);

  protected async switchUser(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/login');
  }
}
