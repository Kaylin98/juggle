import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { RequestsService } from '../core/requests.service';
import { TeamContextService } from '../core/team-context.service';
import { BRANDING } from '../branding';
import { Tooltip } from '../shared/tooltip';
import { NavPrefsService } from './nav-prefs.service';

interface NavItem {
  label: string;
  link: string[];
  icon: string;
  /** Shown as a badge when above zero: New requests waiting in triage. */
  count?: number;
}

// Heroicons (outline, MIT) path data.
const ICONS = {
  capacity:
    'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  board:
    'M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z',
  dashboard:
    'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  requests: 'M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5',
  myRequests:
    'M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z',
  newRequest: 'M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  triage:
    'M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z',
};

/** Pages inside the Requests group: My requests and a request, New request, and a team's Triage. */
const REQUEST_PAGE = /^\/(requests?|t\/[^/]+\/triage)(\/|\?|$)/;

/** In the rail, the Requests group opens beside its icon. */
const FLYOUT_POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 8 },
  { originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom', offsetX: 8 },
];

/**
 * The side menu: the team pages, then a "Requests" group (My requests, New request and, for admins, Triage),
 * open while one of its pages is shown. A toggle shrinks it to a 64px icon rail with tooltips, where badges
 * become dots and the group opens as a flyout; the choice is remembered per user.
 */
@Component({
  selector: 'app-nav',
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger, NgTemplateOutlet, RouterLink, RouterLinkActive, Tooltip],
  templateUrl: './nav.html',
})
export class Nav {
  private readonly auth = inject(AuthService);
  private readonly teamContext = inject(TeamContextService);
  private readonly requests = inject(RequestsService);
  private readonly prefs = inject(NavPrefsService);
  private readonly router = inject(Router);

  protected readonly branding = BRANDING;
  protected readonly icons = ICONS;
  protected readonly flyoutPositions = FLYOUT_POSITIONS;

  protected readonly teamLinks = computed<NavItem[]>(() => {
    const teamId = this.teamContext.teamId();
    if (!teamId) return [];
    const links: NavItem[] = [
      { label: 'Schedule', link: ['/t', teamId, 'capacity'], icon: ICONS.capacity },
      { label: 'Board', link: ['/t', teamId, 'board'], icon: ICONS.board },
    ];
    if (this.isAdmin()) {
      links.push({ label: 'Dashboard', link: ['/t', teamId, 'dashboard'], icon: ICONS.dashboard });
    }
    return links;
  });

  protected readonly requestLinks = computed<NavItem[]>(() => {
    const teamId = this.teamContext.teamId();
    const links: NavItem[] = [
      { label: 'My requests', link: ['/requests'], icon: ICONS.myRequests },
      { label: 'New request', link: ['/request'], icon: ICONS.newRequest },
    ];
    if (teamId && this.isAdmin()) {
      links.push({ label: 'Triage', link: ['/t', teamId, 'triage'], icon: ICONS.triage, count: this.triageCount() });
    }
    return links;
  });

  protected readonly triageCount = computed(() => {
    const inbox = this.requests.inbox;
    return this.isAdmin() && inbox.hasValue() ? inbox.value().length : 0;
  });

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly inRequests = computed(() => REQUEST_PAGE.test(this.url()));

  /** Opens whenever the viewer goes to one of its pages; otherwise stays as they left it. */
  protected readonly requestsOpen = linkedSignal<boolean, boolean>({
    source: this.inRequests,
    computation: (inside, previous) => inside || (previous?.value ?? false),
  });

  /** Shrunk to the icon rail. */
  protected readonly collapsed = linkedSignal(() => {
    const userId = this.auth.me()?.id;
    return userId ? this.prefs.isCollapsed(userId) : false;
  });

  protected toggleCollapsed(): void {
    this.collapsed.update((collapsed) => !collapsed);
    this.prefs.saveCollapsed(this.auth.me()!.id, this.collapsed());
  }

  private isAdmin(): boolean {
    const teamId = this.teamContext.teamId();
    return teamId !== null && this.auth.roleIn(teamId) === 'TeamAdmin';
  }
}
