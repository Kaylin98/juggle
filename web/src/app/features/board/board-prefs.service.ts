import { Injectable } from '@angular/core';
import { ColumnOverrides } from './column-collapse';

const KEY_PREFIX = 'juggle.board.columns.';

/** The viewer's own collapse and expand choices for board columns, remembered per team in this browser only. */
@Injectable({ providedIn: 'root' })
export class BoardPrefsService {
  columnOverrides(teamId: string): ColumnOverrides {
    try {
      const saved = localStorage.getItem(KEY_PREFIX + teamId);
      if (saved !== null) return JSON.parse(saved) as ColumnOverrides;
    } catch {
      // Storage can be blocked (private windows, site settings); fall back to the automatic behaviour.
    }
    return {};
  }

  saveColumnOverrides(teamId: string, overrides: ColumnOverrides): void {
    try {
      localStorage.setItem(KEY_PREFIX + teamId, JSON.stringify(overrides));
    } catch {
      // Not saved; the choice still applies until the page reloads.
    }
  }
}
