import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CreateRequest, RequestOptions, WorkRequest } from '../../core/models';
import { RequestsService } from '../../core/requests.service';
import { TeamContextService } from '../../core/team-context.service';
import { RequestFormPage } from './request-form';

const options: RequestOptions = {
  teams: [{ id: 'studio', name: 'Studio', colour: '#8a78d6' }],
  departments: [{ id: 'dji', name: 'DJI' }],
  marketingManagers: [
    { id: 'me', name: 'Zanele Mthembu', avatarColour: '#5b8def' },
    { id: 'other', name: 'Pieter Smit', avatarColour: '#3fa7a0' },
  ],
  priorities: ['Low', 'Medium', 'High', 'Urgent'],
  myDepartmentId: 'dji',
};

async function render() {
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
      { provide: AuthService, useValue: { me: signal({ id: 'me' }), departmentLabel: signal('Brand') } },
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

describe('RequestFormPage', () => {
  afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

  it("follows the brief template, worded with the org's label", async () => {
    const { element } = await render();
    const labels = [...element.querySelectorAll('label')].map((l) => l.textContent?.trim());
    expect(labels).toEqual([
      'Team',
      'Brand',
      'Job name',
      'Main goal',
      'Deliverables, one per line',
      'Marketing manager',
      'Studio deadline',
      'Priority',
    ]);
    expect(element.querySelector('#request-manager')!.textContent).toContain('Zanele Mthembu');
  });

  it('sends the brief with the user as the marketing manager by default', async () => {
    const { fixture, element, sent } = await render();
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
        marketingManagerUserId: 'me',
        requestedDueDate: null,
        priority: 'Medium',
      },
    ]);
  });

  it('keeps each deliverable short enough to become a task title', async () => {
    const { fixture, element, sent } = await render();
    type(element, '#request-title', 'Festive gifting');
    type(element, '#request-deliverables', `Banner\n${'x'.repeat(201)}`);
    await submit(fixture);

    expect(element.textContent).toContain('Keep each deliverable under 200 characters.');
    expect(sent).toEqual([]);
  });
});
