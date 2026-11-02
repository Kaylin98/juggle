import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { WorkflowAction } from '../../core/models';
import { job } from '../board/job.fixture';
import { JobActions } from './job-actions';

async function buttons(actions: WorkflowAction[]): Promise<string[]> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AuthService,
        useValue: { terms: signal({ department: 'Brand', brief: 'Brief', job: 'Job' }) },
      },
      { provide: JobsService, useValue: {} },
    ],
  });
  const fixture = TestBed.createComponent(JobActions);
  fixture.componentRef.setInput('job', job({ actions }));
  await fixture.whenStable();
  return [...fixture.nativeElement.querySelectorAll('button')].map((b) =>
    (b as HTMLElement).textContent!.trim(),
  );
}

describe('JobActions', () => {
  it('offers a button for each action the API lists, and only those', async () => {
    expect(await buttons(['MarkReady', 'AllocateAndSchedule', 'Cancel', 'Start'])).toEqual([
      'Allocate and schedule',
      'Checked, allocate later',
      'Start work',
      'Cancel job',
    ]);
  });

  it('offers the designer, head of design and marketing manager their steps', async () => {
    expect(await buttons(['Start'])).toEqual(['Start work']);
    expect(await buttons(['SubmitForApproval'])).toEqual(['Submit artwork']);
    expect(await buttons(['SendBack', 'ApproveDesign'])).toEqual(['Approve design', 'Send back']);
    expect(await buttons(['RequestChanges', 'NeedsBusinessApproval', 'ApproveMarketing'])).toEqual([
      'Approve artwork',
      'Needs business approval',
      'Request changes',
    ]);
    expect(await buttons(['Close'])).toEqual(['Close job']);
  });

  it('shows nothing when the user may take no action', async () => {
    expect(await buttons([])).toEqual([]);
  });
});
