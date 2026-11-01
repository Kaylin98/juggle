import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { CreateJob, JobDetail, JobOptions } from '../../core/models';
import { TeamContextService } from '../../core/team-context.service';
import { RequestFormPage } from './request-form';

const options: JobOptions = {
  teams: [{ id: 'studio', name: 'Studio', colour: '#8a78d6' }],
  departments: [{ id: 'dji', name: 'DJI' }],
  priorities: ['Low', 'Medium', 'High', 'Urgent'],
  categories: ['Campaign', 'Promotion', 'Other'],
  deliverableTypes: ['SocialMedia', 'WebsiteBanner', 'Print', 'Other'],
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
          submit: (brief: CreateJob) => {
            sent.push(brief);
            return Promise.resolve({ job: { id: 'j1', code: "DJI0143_Q1'27_Festive gifting" } } as JobDetail);
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

async function type(fixture: ComponentFixture<RequestFormPage>, selector: string, value: string): Promise<void> {
  const field = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  field.value = value;
  field.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

async function click(fixture: ComponentFixture<RequestFormPage>, text: string): Promise<void> {
  const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent!.trim() === text)!;
  button.click();
  await fixture.whenStable();
}

async function submit(fixture: ComponentFixture<RequestFormPage>): Promise<void> {
  (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
}

describe('RequestFormPage', () => {
  afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

  it('has every section of the brief template, A to F, worded with the org\'s terms', async () => {
    const { element } = await render();

    expect([...element.querySelectorAll('form section h2')].map((h) => h.textContent!.trim())).toEqual([
      'A. Job information',
      'B. Brief objectives',
      'C. Required deliverables',
      'D. Creative guidelines',
      'E. Supporting material',
      'F. Additional information',
    ]);
    const labels = [...element.querySelectorAll('label, span.form-label')].map((l) => l.textContent!.trim());
    expect(labels).toEqual(
      expect.arrayContaining([
        'Brand',
        'Job title',
        'Campaign or project',
        'Category',
        'Required completion date',
        'Priority',
        'New job or revision',
        'Purpose of the artwork',
        'Target audience',
        'Type',
        'Dimensions and specifications',
        'Deadline',
        'Brand identity and CI requirements',
        'Legal disclaimers',
      ]),
    );
    expect(element.textContent).toContain('Send brief');
  });

  it('sends the brief with several deliverables and links, trimmed and with blanks as null', async () => {
    const { fixture, sent } = await render();
    await type(fixture, '#brief-title', ' Festive gifting ');
    await type(fixture, '#brief-purpose', 'Drive festive gift sales.');
    await type(fixture, '#deliverable-description-0', 'Takealot banners');
    await type(fixture, '#deliverable-specs-0', '1200 x 628');
    await click(fixture, 'Add a deliverable');
    await type(fixture, '#deliverable-description-1', 'Shelf wobblers');
    await click(fixture, 'Add a link');
    await type(fixture, '#link-url-0', 'https://example.com/guidelines');
    await type(fixture, '#link-label-0', 'Guidelines');
    await submit(fixture);

    expect(sent.length).toBe(1);
    const brief = sent[0];
    expect([brief.teamId, brief.departmentId, brief.title, brief.campaign, brief.category, brief.revisesJobCode]).toEqual([
      'studio',
      'dji',
      'Festive gifting',
      null,
      null,
      null,
    ]);
    expect(brief.objectives.purpose).toBe('Drive festive gift sales.');
    expect(brief.objectives.targetAudience).toBeNull();
    expect(brief.deliverables).toEqual([
      { type: 'SocialMedia', description: 'Takealot banners', specifications: '1200 x 628', dueDate: null },
      { type: 'SocialMedia', description: 'Shelf wobblers', specifications: null, dueDate: null },
    ]);
    expect(brief.links).toEqual([{ url: 'https://example.com/guidelines', label: 'Guidelines' }]);
    expect(brief.guidelines.legalDisclaimers).toBeNull();
  });

  it('asks for the existing job ID only for a revision', async () => {
    const { fixture, element, sent } = await render();
    expect(element.querySelector('#brief-revises')).toBeNull();

    await click(fixture, 'Revision of a job');
    await type(fixture, '#brief-title', 'Black Friday price change');
    await type(fixture, '#deliverable-description-0', 'Takealot banners');
    await type(fixture, '#brief-revises', "DJI0141_Q1'27_Black Friday");
    await submit(fixture);

    expect(sent[0].revisesJobCode).toBe("DJI0141_Q1'27_Black Friday");
  });

  it('checks each deliverable and link before sending', async () => {
    const { fixture, element, sent } = await render();
    await type(fixture, '#brief-title', 'Festive gifting');
    await click(fixture, 'Add a link');
    await type(fixture, '#link-url-0', 'sharepoint folder');
    await submit(fixture);

    expect(element.textContent).toContain('Say what the deliverable is.');
    expect(element.textContent).toContain('Use a full link, starting with https://.');
    expect(sent).toEqual([]);
  });

  it('starts on the only team for a user who is in no team, such as a marketing manager (D73)', async () => {
    const { fixture, sent } = await render(null);
    await type(fixture, '#brief-title', 'Festive gifting');
    await click(fixture, 'Remove');
    await submit(fixture);

    expect(sent.map((s) => s.teamId)).toEqual(['studio']);
  });
});
