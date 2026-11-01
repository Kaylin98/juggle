import { Injectable } from '@angular/core';

const KEY_PREFIX = 'juggle.schedule.hidden.';

/**
 * The people a user hid from the schedule, remembered per user in this browser only (D60). Hidden rather than shown,
 * so someone who joins a team appears without anyone choosing them.
 */
@Injectable({ providedIn: 'root' })
export class SchedulePrefsService {
  hiddenPeople(userId: string): Set<string> {
    try {
      const saved = localStorage.getItem(KEY_PREFIX + userId);
      if (saved !== null) return new Set(JSON.parse(saved) as string[]);
    } catch {
      // Storage can be blocked (private windows, site settings); everyone is shown.
    }
    return new Set();
  }

  saveHiddenPeople(userId: string, personIds: ReadonlySet<string>): void {
    try {
      localStorage.setItem(KEY_PREFIX + userId, JSON.stringify([...personIds]));
    } catch {
      // Not saved; the choice still applies until the page reloads.
    }
  }
}
