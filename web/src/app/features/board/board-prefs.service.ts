import { Injectable } from '@angular/core';

const KEY_PREFIX = 'juggle.board.collapsed.';
const OLD_KEY_PREFIX = 'juggle.board.columns.';

/** The board columns a user collapsed by hand, remembered per user in this browser only. */
@Injectable({ providedIn: 'root' })
export class BoardPrefsService {
  constructor() {
    this.clearOldKeys();
  }

  collapsedColumns(userId: string): Set<string> {
    try {
      const saved = localStorage.getItem(KEY_PREFIX + userId);
      if (saved !== null) return new Set(JSON.parse(saved) as string[]);
    } catch {
      // Storage can be blocked (private windows, site settings); fall back to the automatic behaviour.
    }
    return new Set();
  }

  saveCollapsedColumns(userId: string, statusIds: ReadonlySet<string>): void {
    try {
      localStorage.setItem(KEY_PREFIX + userId, JSON.stringify([...statusIds]));
    } catch {
      // Not saved; the choice still applies until the page reloads.
    }
  }

  /** Earlier versions saved collapse and expand choices per team under another key. */
  private clearOldKeys(): void {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(OLD_KEY_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
    } catch {
      // Storage is blocked, so there is nothing to clear.
    }
  }
}
