import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AcceptRequest, NewBrief, WorkRequest } from '../../core/models';
import { RequestsService } from '../../core/requests.service';
import { AcceptDialog } from './accept-dialog';

const request: WorkRequest = {
  id: 'r1',
  teamId: 'studio',
  teamName: 'Studio',
  title: 'Festive gifting',
  mainGoal: 'Drive festive gift sales.',
  deliverables: ['Takealot banners', 'Social tiles x6', 'Email header'],
  department: 'DJI',
  requesterName: 'Zanele Mthembu',
  requestedDueDate: '2026-11-13',
  priority: 'High',
  status: 'New',
  taskId: null,
  rejectionReason: null,
  createdAt: '2026-10-31T10:00:00Z',
  assigneeName: null,
  committedDueDate: null,
};

async function render(newBrief: NewBrief) {
  const sent: AcceptRequest[] = [];
  TestBed.configureTestingModule({
    imports: [AcceptDialog],
    providers: [
      {
        provide: RequestsService,
        useValue: {
          acceptOptions: () =>
            Promise.resolve({
              projects: [{ id: 'bf', name: "DJI0141_Q1'27_Black Friday", colour: '#d9a441', department: 'DJI' }],
              people: [],
            }),
          newBrief: () => Promise.resolve(newBrief),
          accept: (_id: string, accept: AcceptRequest) => {
            sent.push(accept);
            return Promise.resolve(request);
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(AcceptDialog);
  fixture.componentRef.setInput('request', request);
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement, sent };
}

function tab(element: HTMLElement, name: string): HTMLButtonElement {
  return [...element.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((t) => t.textContent!.trim() === name)!;
}

async function submit(fixture: ComponentFixture<AcceptDialog>): Promise<void> {
  (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
}

describe('AcceptDialog', () => {
  afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

  it('opens on a new brief with the proposed job code, editable, and sends it', async () => {
    const { fixture, element, sent } = await render({ projectName: "DJI0143_Q1'27_Festive gifting", colour: '#3fa7a0' });

    expect(tab(element, 'New brief').getAttribute('aria-selected')).toBe('true');
    const name = element.querySelector<HTMLInputElement>('#accept-name')!;
    expect(name.value).toBe("DJI0143_Q1'27_Festive gifting");
    expect(element.textContent).toContain('3 tasks, one per deliverable');
    name.value = "DJI0143_Q1'27_Festive gifting kit ";
    name.dispatchEvent(new Event('input'));
    await submit(fixture);

    expect(sent).toEqual([
      {
        projectId: null,
        newProjectName: "DJI0143_Q1'27_Festive gifting kit",
        assigneePersonId: null,
        estimateHours: null,
        dueDate: '2026-11-13',
      },
    ]);
  });

  it('falls back to an existing project when the brand has no job code prefix', async () => {
    const { fixture, element, sent } = await render({ projectName: null, colour: '#3fa7a0' });

    expect(tab(element, 'New brief').disabled).toBe(true);
    expect(tab(element, 'Existing project').getAttribute('aria-selected')).toBe('true');
    await submit(fixture);

    expect(element.textContent).toContain('Choose the project this work is for.');
    expect(sent).toEqual([]);
  });
});
