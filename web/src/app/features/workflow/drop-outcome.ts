import { BoardColumn, Job, Terms, Workflow, WorkflowAction } from '../../core/models';
import { ONE_CLICK_ACTIONS, actionLabels } from './action-labels';

/**
 * What dropping a card on a column does (D74): runs the action when it needs only a click, opens the action's form
 * when it needs more, offers a choice when several actions lead there, or is refused with a hint that names what the
 * user can do.
 */
export type DropOutcome =
  | { kind: 'run' | 'open'; action: WorkflowAction }
  | { kind: 'choose'; actions: WorkflowAction[] }
  | { kind: 'refuse'; hint: string };

const columnsByStatus = (workflow: Workflow): Map<string, string> =>
  new Map(workflow.columns.flatMap((c) => c.statuses.map((s) => [s.id, c.id] as const)));

/** The actions the user may take on the job that move it to the column, in the order of the workflow steps. */
export function actionsLeadingTo(job: Job, target: BoardColumn, workflow: Workflow): WorkflowAction[] {
  const columnOf = columnsByStatus(workflow);
  if (columnOf.get(job.statusId) === target.id) return [];
  return [
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
}

/**
 * A card moves between columns only by a workflow action the user may take on it. A drop that maps to one action goes
 * ahead, one that maps to several offers them, and any other drop is refused. Dropping on the card's own column does
 * nothing.
 */
export function dropOutcome(
  job: Job,
  target: BoardColumn,
  workflow: Workflow,
  terms: Terms,
): DropOutcome | null {
  if (columnsByStatus(workflow).get(job.statusId) === target.id) return null;
  const leadingHere = actionsLeadingTo(job, target, workflow);

  if (leadingHere.length === 1) {
    const action = leadingHere[0];
    return { kind: ONE_CLICK_ACTIONS.includes(action) ? 'run' : 'open', action };
  }
  if (leadingHere.length > 1) return { kind: 'choose', actions: leadingHere };
  const labels = actionLabels(terms);
  return {
    kind: 'refuse',
    hint: job.actions.length
      ? `Nothing you can do moves it to ${target.name}. You can: ${job.actions.map((a) => labels[a]).join(', ')}.`
      : `There is nothing you can do on this ${terms.job.toLowerCase()} right now.`,
  };
}
