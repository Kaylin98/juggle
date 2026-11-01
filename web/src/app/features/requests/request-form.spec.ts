import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CreateJob, Job, JobOptions } from '../../core/models';
import { JobsService } from '../../core/jobs.service';
import { TeamContextService } from '../../core/team-context.service';
import { RequestFormPage } from './request-form';

const options: JobOptions = {
  teams: [{ id: 'studio', name: 'Studio', colour: '#8a78d6' }],
  departments: [{ id: 'dji', name: 'DJI' }],
  priorities: ['Low', 'Medium', 'High', 'Urgent'],
  myDepartmentId: 'dji',
};

async function render(teamId: string | null = 'studio') {
  const sent: CreateJob[] = [];
  TestBed.configureTestingModule({
    imports: [RequestFormPage],
    providers: [
      provideRouter([]),
      {
        provide: JobsService,
        useValue: {
          options: () => Promise.resolve(options),
          submit: (request: CreateJob) => {
            sent.push(request);
            return Promise.resolve({ id: 'j1', code: "DJI0143_Q1'27_Festive gifting" } as Job);
          },
        },
      },
      {
        provide: AuthService,
        useValue: {
          departmentLabel: signal('Brand'),
          terms: signal({ department: 'Brand', brief: 'Brief', job: 'Job' }),
        },
      },
      { provide: TeamContextService, useValue: { teamId: signal(teamId) } },
    ],
  });
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(RequestFormPage);
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement, sent };
}

function type(element: HTMLElement, selector: string, value: string): void {
  const field = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  field.value = value;
  field.dispatchEvent(new Event('input'));
}

async function submit(fixture: ComponentFixture<RequestFormPage>): Promise<void> {
  (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
}

function labels(element: HTMLElement): (string | undefined)[] {
  return [...element.querySelectorAll('label')].map((l) => l.textContent?.trim());
}

describe('RequestFormPage', () => {
  afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

  it("follows the brief template, worded with the org's label, with no 'Requested by'", async () => {
    const { fixture, element, sent } = await render();
    expect(labels(element)).toEqual([
      'Team',
      'Brand',
      'Job name',
      'Main goal',
      'Deliverables, one per line',
      'Studio deadline',
      'Priority',
    ]);

    type(element, '#request-title', ' Festive gifting ');
    type(element, '#request-goal', 'Drive festive gift sales.');
    type(element, '#request-deliverables', 'Takealot banners\nSocial tiles x6\n');
    await submit(fixture);

    expect(sent).toEqual([
      {
        teamId: 'studio',
        departmentId: 'dji',
        title: 'Festive gifting',
        mainGoal: 'Drive festive gift sales.',
        deliverables: 'Takealot banners\nSocial tiles x6',
        requiredDate: null,
        priority: 'Medium',
      },
    ]);
  });

  it('starts on the only team for a user who is in no team, such as a marketing manager (D73)', async () => {
    const { fixture, element, sent } = await render(null);
    type(element, '#request-title', 'Festive gifting');
    await submit(fixture);

    expect(sent.map((s) => s.teamId)).toEqual(['studio']);
  });

  it('keeps each deliverable under 200 characters', async () => {
    const { fixture, element, sent } = await render();
    type(element, '#request-title', 'Festive gifting');
    type(element, '#request-deliverables', `Banner\n${'x'.repeat(201)}`);
    await submit(fixture);

    expect(element.textContent).toContain('Keep each deliverable under 200 characters.');
    expect(sent).toEqual([]);
  });
});
