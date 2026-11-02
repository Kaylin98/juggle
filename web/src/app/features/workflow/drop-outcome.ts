import { BoardColumn, Job, Terms, Workflow, WorkflowAction } from '../../core/models';
import { ONE_CLICK_ACTIONS, actionLabels } from './action-labels';

/**
 * What dropping a card on a column does (D74): runs the action when it needs only a click, opens the action's form
 * when it needs more, or is refused with a hint that names the action.
 */
export type DropOutcome =
  { kind: 'run' | 'open'; action: WorkflowAction } | { kind: 'refuse'; hint: string };

/**
 * A card moves between columns only by a workflow action the user may take on it. A drop that maps to exactly one such
 * action goes ahead; any other drop is refused and the hint names what to do instead. Dropping on the card's own
 * column does nothing.
 */
export function dropOutcome(
  job: Job,
  target: BoardColumn,
  workflow: Workflow,
  terms: Terms,
): DropOutcome | null {
  const columnOf = new Map(
    workflow.columns.flatMap((c) => c.statuses.map((s) => [s.id, c.id] as const)),
  );
  if (columnOf.get(job.statusId) === target.id) return null;

  const labels = actionLabels(terms);
  const leadingHere = [
    ...new Set(
      workflow.steps
        .filter(
          (s) =>
            s.fromStatusId === job.statusId &&
            columnOf.get(s.toStatusId) === target.id &&
            job.actions.includes(s.action),
        )
        .map((s) => s.action),
    ),
  ];

  if (leadingHere.length === 1) {
    const action = leadingHere[0];
    return { kind: ONE_CLICK_ACTIONS.includes(action) ? 'run' : 'open', action };
  }
  if (leadingHere.length > 1) {
    return {
      kind: 'refuse',
      hint: `More than one action moves it to ${target.name}: ${leadingHere.map((a) => labels[a]).join(' or ')}. Open it and choose one.`,
    };
  }
  return {
    kind: 'refuse',
    hint: job.actions.length
      ? `Nothing you can do moves it to ${target.name}. You can: ${job.actions.map((a) => labels[a]).join(', ')}.`
      : `There is nothing you can do on this ${terms.job.toLowerCase()} right now.`,
  };
}
