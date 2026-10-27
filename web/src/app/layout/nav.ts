import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { TeamContextService } from '../core/team-context.service';
import { BRANDING } from '../branding';

interface NavItem {
  label: string;
  link: string[];
  icon: string;
}

// Heroicons (outline, MIT) path data.
const ICONS = {
  capacity:
    'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  board:
    'M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z',
  triage:
    'M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z',
  dashboard:
    'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  request: 'M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
};

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.html',
})
export class Nav {
  private readonly auth = inject(AuthService);
  private readonly teamContext = inject(TeamContextService);

  protected readonly branding = BRANDING;

  protected readonly items = computed<NavItem[]>(() => {
    const teamId = this.teamContext.teamId();
    const items: NavItem[] = [];
    if (teamId) {
      items.push(
        { label: 'Schedule', link: ['/t', teamId, 'capacity'], icon: ICONS.capacity },
        { label: 'Board', link: ['/t', teamId, 'board'], icon: ICONS.board },
      );
      if (this.auth.roleIn(teamId) === 'TeamAdmin') {
        items.push(
          { label: 'Triage', link: ['/t', teamId, 'triage'], icon: ICONS.triage },
          { label: 'Dashboard', link: ['/t', teamId, 'dashboard'], icon: ICONS.dashboard },
        );
      }
    }
    items.push({ label: 'New request', link: ['/request'], icon: ICONS.request });
    return items;
  });
}
