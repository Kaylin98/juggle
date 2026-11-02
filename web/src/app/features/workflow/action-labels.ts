import { Terms, WorkflowAction } from '../../core/models';

/** The actions that need no more than a click, so they run at once; the rest open a form for what they need. */
export const ONE_CLICK_ACTIONS: readonly WorkflowAction[] = ['MarkReady', 'Start', 'Close'];

/** What each action's button reads, in the organisation's words (D48, D77). */
export function actionLabels(terms: Terms): Record<WorkflowAction, string> {
  return {
    Answer: 'Answer the question',
    AllocateAndSchedule: 'Allocate and schedule',
    MarkReady: 'Checked, allocate later',
    RequestInformation: 'Request information',
    Cancel: `Cancel ${terms.job.toLowerCase()}`,
    Start: 'Start work',
    SubmitForApproval: 'Submit artwork',
    ApproveDesign: 'Approve design',
    SendBack: 'Send back',
    ApproveMarketing: 'Approve artwork',
    NeedsBusinessApproval: 'Needs business approval',
    RecordBusinessApproval: 'Record business approval',
    RequestChanges: 'Request changes',
    Close: `Close ${terms.job.toLowerCase()}`,
  };
}

/** A hint under a button, for the actions whose name alone does not say what happens. */
export function actionHints(terms: Terms): Partial<Record<WorkflowAction, string>> {
  return {
    MarkReady: `The ${terms.brief.toLowerCase()} has everything needed. Moves it to Ready to allocate.`,
  };
}
