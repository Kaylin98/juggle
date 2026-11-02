import { BoardColumn, Terms, Workflow, WorkflowAction } from '../../core/models';
import { job } from '../board/job.fixture';
import { dropOutcome } from './drop-outcome';

const terms: Terms = { department: 'Brand', brief: 'Brief', job: 'Job' };

const status = (id: string, kind: 'Open' | 'Done' = 'Open') => ({
  id,
  name: id,
  colour: '#5b8def',
  kind,
});
const incoming: BoardColumn = {
  id: 'incoming',
  name: 'Incoming',
  statuses: [status('new'), status('allocation')],
};
const design: BoardColumn = {
  id: 'design',
  name: 'Design',
  statuses: [status('scheduled'), status('progress')],
};
const done: BoardColumn = { id: 'done', name: 'Done', statuses: [status('closed', 'Done')] };

const step = (action: WorkflowAction, fromStatusId: string, toStatusId: string) => ({
  action,
  fromStatusId,
  toStatusId,
});
const workflow: Workflow = {
  columns: [incoming, design, done],
  scheduledStatusIds: ['scheduled'],
  steps: [
    step('MarkReady', 'new', 'allocation'),
    step('AllocateAndSchedule', 'new', 'scheduled'),
    step('AllocateAndSchedule', 'allocation', 'scheduled'),
    step('Cancel', 'new', 'closed'),
    step('Start', 'scheduled', 'progress'),
    step('Close', 'progress', 'closed'),
  ],
};

describe('dropOutcome', () => {
  it('opens the form of the one action that leads to the column', () => {
    const card = job({ statusId: 'new', actions: ['MarkReady', 'AllocateAndSchedule', 'Cancel'] });

    expect(dropOutcome(card, design, workflow, terms)).toEqual({
      kind: 'open',
      action: 'AllocateAndSchedule',
    });
    expect(dropOutcome(card, done, workflow, terms)).toEqual({ kind: 'open', action: 'Cancel' });
  });

  it('runs an action that needs only a click', () => {
    const card = job({ statusId: 'progress', actions: ['Close'] });

    expect(dropOutcome(card, done, workflow, terms)).toEqual({ kind: 'run', action: 'Close' });
  });

  it('ignores actions the user may not take', () => {
    const card = job({ statusId: 'new', actions: ['MarkReady'] });

    expect(dropOutcome(card, design, workflow, terms)).toEqual({
      kind: 'refuse',
      hint: 'Nothing you can do moves it to Design. You can: Brief complete.',
    });
  });

  it('refuses a drop that no action leads to, naming what the user can do', () => {
    const card = job({ statusId: 'new', actions: ['MarkReady', 'Cancel'] });

    expect(dropOutcome(card, incoming, workflow, terms)).toBeNull();
    expect(dropOutcome({ ...card, actions: [] }, done, workflow, terms)).toEqual({
      kind: 'refuse',
      hint: 'There is nothing you can do on this job right now.',
    });
  });

  it('refuses when several actions lead to the column', () => {
    const both: Workflow = {
      ...workflow,
      steps: [...workflow.steps, step('Close', 'new', 'closed')],
    };
    const card = job({ statusId: 'new', actions: ['Cancel', 'Close'] });

    expect(dropOutcome(card, done, both, terms)).toEqual({
      kind: 'refuse',
      hint: 'More than one action moves it to Done: Cancel job or Close job. Open it and choose one.',
    });
  });
});
