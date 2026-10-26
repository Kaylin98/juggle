import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
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

  protected async switchUser(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/login');
  }
}
