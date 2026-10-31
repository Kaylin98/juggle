import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CreateRequest, RequestOptions, TeamRole, WorkRequest } from '../../core/models';
import { RequestsService } from '../../core/requests.service';
import { TeamContextService } from '../../core/team-context.service';
import { RequestFormPage } from './request-form';

const options: RequestOptions = {
  teams: [{ id: 'studio', name: 'Studio', colour: '#8a78d6' }],
  departments: [{ id: 'dji', name: 'DJI' }],
  requesters: [
    { id: 'zanele', name: 'Zanele Mthembu', avatarColour: '#5b8def' },
    { id: 'pieter', name: 'Pieter Smit', avatarColour: '#3fa7a0' },
  ],
  priorities: ['Low', 'Medium', 'High', 'Urgent'],
  myDepartmentId: 'dji',
};

/** `roleInStudio` is the user's role in the team asked: null for a brand's marketing manager. */
async function render(roleInStudio: TeamRole | null) {
  const sent: CreateRequest[] = [];
  TestBed.configureTestingModule({
    imports: [RequestFormPage],
    providers: [
      provideRouter([]),
      {
        provide: RequestsService,
        useValue: {
          options: () => Promise.resolve(options),
          create: (request: CreateRequest) => {
            sent.push(request);
            return Promise.resolve({ id: 'r1' } as WorkRequest);
          },
        },
      },
      {
        provide: AuthService,
        useValue: {
          departmentLabel: signal('Brand'),
          roleIn: (teamId: string) => (teamId === 'studio' ? roleInStudio : null),
        },
      },
      { provide: TeamContextService, useValue: { teamId: signal('studio') } },
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

  it("follows the brief template, worded with the org's label, and a brand's manager sends as themselves", async () => {
    const { fixture, element, sent } = await render(null);
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
        requestedByUserId: null,
        title: 'Festive gifting',
        mainGoal: 'Drive festive gift sales.',
        deliverables: 'Takealot banners\nSocial tiles x6',
        requestedDueDate: null,
        priority: 'Medium',
      },
    ]);
  });

  it('lets a member of the team asked log the brief for a marketing manager, who must be chosen', async () => {
    const { fixture, element, sent } = await render('Member');
    expect(labels(element)).toContain('Requested by');
    type(element, '#request-title', 'Festive gifting');
    await submit(fixture);
    expect(element.textContent).toContain('Choose who the brief is from.');
    expect(sent).toEqual([]);

    element.querySelector<HTMLButtonElement>('#request-by')!.click();
    await fixture.whenStable();
    const choices = [...document.querySelectorAll<HTMLElement>('[role=option]')];
    // Only the brands' marketing managers (each option also shows the avatar's initials).
    expect(choices.map((o) => o.textContent)).toEqual([
      expect.stringContaining('Choose who the brief is from'),
      expect.stringContaining('Zanele Mthembu'),
      expect.stringContaining('Pieter Smit'),
    ]);
    choices.find((o) => o.textContent?.includes('Zanele Mthembu'))!.click();
    await submit(fixture);

    expect(sent.map((r) => r.requestedByUserId)).toEqual(['zanele']);
  });

  it('keeps each deliverable short enough to become a task title', async () => {
    const { fixture, element, sent } = await render(null);
    type(element, '#request-title', 'Festive gifting');
    type(element, '#request-deliverables', `Banner\n${'x'.repeat(201)}`);
    await submit(fixture);

    expect(element.textContent).toContain('Keep each deliverable under 200 characters.');
    expect(sent).toEqual([]);
  });
});
