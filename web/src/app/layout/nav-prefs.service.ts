import { Injectable } from '@angular/core';

const KEY_PREFIX = 'juggle.nav.collapsed.';

/** Whether a user shrank the side menu to its icon rail, remembered per user in this browser only. */
@Injectable({ providedIn: 'root' })
export class NavPrefsService {
  isCollapsed(userId: string): boolean {
    try {
      return localStorage.getItem(KEY_PREFIX + userId) === 'true';
    } catch {
      // Storage can be blocked (private windows, site settings); the menu starts expanded.
      return false;
    }
  }

  saveCollapsed(userId: string, collapsed: boolean): void {
    try {
      localStorage.setItem(KEY_PREFIX + userId, String(collapsed));
    } catch {
      // Not saved; the choice still applies until the page reloads.
    }
  }
}
