import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateTask, Person, Project, Task, WorkflowStatus } from '../../core/models';
import { BoardService } from './board.service';
import { NewTaskDrawer } from './new-task-drawer';

const status: WorkflowStatus = { id: 'todo', name: 'To Do', order: 1, category: 'Todo' };
const projects: Project[] = [{ id: 'deck', name: 'Sales Deck', colour: '#3fa7a0', department: 'Sales' }];
const people: Person[] = [
  { id: 'p1', name: 'Priya Naidoo', avatarColour: '#5b8def', jobTitle: 'Junior Designer', hoursPerDay: 8 },
  { id: 'p2', name: 'Ethan Pillay', avatarColour: '#3fa7a0', jobTitle: 'Senior UI Designer', hoursPerDay: 8 },
];

async function render(ownPersonId: string | null) {
  const sent: CreateTask[] = [];
  TestBed.configureTestingModule({
    imports: [NewTaskDrawer],
    providers: [
      {
        provide: BoardService,
        useValue: {
          createTask: (_teamId: string, task: CreateTask) => {
            sent.push(task);
            return Promise.resolve({ id: 'new' } as Task);
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(NewTaskDrawer);
  fixture.componentRef.setInput('teamId', 'design');
  fixture.componentRef.setInput('status', status);
  fixture.componentRef.setInput('projects', projects);
  fixture.componentRef.setInput('people', people);
  fixture.componentRef.setInput('ownPersonId', ownPersonId);
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement, sent };
}

async function submit(fixture: ComponentFixture<NewTaskDrawer>): Promise<void> {
  (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
}

describe('NewTaskDrawer', () => {
  afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

  it('assigns a Member to the task and does not let them change it', async () => {
    const { element } = await render('p1');
    const assignee = element.querySelector<HTMLButtonElement>('#new-task-assignee')!;
    expect(assignee.textContent).toContain('Priya Naidoo');
    expect(assignee.disabled).toBe(true);
  });

  it('asks for a title and a project before adding', async () => {
    const { fixture, element, sent } = await render(null);
    await submit(fixture);
    expect(element.textContent).toContain('Enter a title.');
    expect(element.textContent).toContain('Choose the project this work is for.');
    expect(sent).toEqual([]);
  });

  it('adds the task to the column it was opened from', async () => {
    const { fixture, element, sent } = await render(null);
    const title = element.querySelector<HTMLInputElement>('#new-task-title')!;
    title.value = ' Q1 one-pager ';
    title.dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('#new-task-project')!.click();
    await fixture.whenStable();
    [...document.querySelectorAll<HTMLElement>('[role=option]')].find((o) => o.textContent?.includes('Sales Deck'))!.click();
    await submit(fixture);

    expect(sent).toEqual([
      {
        title: 'Q1 one-pager',
        projectId: 'deck',
        statusId: 'todo',
        assigneePersonId: null,
        estimateHours: null,
        dueDate: null,
        link: null,
      },
    ]);
  });
});
