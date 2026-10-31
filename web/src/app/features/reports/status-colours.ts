import { StatusCategory, StatusCount } from '../../core/models';

/**
 * Status colours come from the status's category: grey to do, blue in progress, amber in review, green done. A second
 * status in the same category (Awaiting approval after Feedback needed, Published after Scheduled) takes the darker
 * step, so neighbouring segments stay apart, also for colour-blind readers (checked with the dataviz validator).
 */
const SHADES: Record<StatusCategory, [string, string]> = {
  Todo: ['bg-ink-faint', 'bg-ink-muted'],
  InProgress: ['bg-accent-500', 'bg-accent-700'],
  Review: ['bg-warn-500', 'bg-warn-700'],
  Done: ['bg-ok-500', 'bg-ok-700'],
};

/** The background class for each status id, in board order. */
export function statusColours(statuses: StatusCount[]): Map<string, string> {
  const seen = new Map<StatusCategory, number>();
  return new Map(
    statuses.map((status) => {
      const index = seen.get(status.category) ?? 0;
      seen.set(status.category, index + 1);
      return [status.statusId, SHADES[status.category][Math.min(index, 1)]];
    }),
  );
}
