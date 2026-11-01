import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Person, Task, TaskBooking } from '../../core/models';
import { TeamContextService } from '../../core/team-context.service';
import { BoardService } from './board.service';
import { defaults } from './book-on-schedule';
import { BoardCard } from './task-card';
import { TaskDrawer } from './task-drawer';

const priya: Person = { id: 'p1', name: 'Priya Naidoo', avatarColour: '#5b8def', jobTitle: 'Junior Designer', hoursPerDay: 8 };

function task(changes: Partial<Task>): Task {
  return {
    id: 't1',
    projectId: 'p',
    statusId: 's',
    title: 'Takealot banners',
    description: null,
    assigneePersonId: 'p1',
    estimateHours: 16,
    dueDate: null,
    isOverdue: false,
    isDueSoon: false,
    reviewCycle: 1,
    sortOrder: 0,
    link: null,
    bookedHours: 0,
    bookings: [],
    feedback: null,
    ...changes,
  };
}

function booked(hours: number): Partial<Task> {
  const booking: TaskBooking = { personId: 'p1', personName: 'Priya Naidoo', startDate: '2026-11-04', endDate: '2026-11-05', hoursPerDay: 4, hours };
  return { bookedHours: hours, bookings: [booking] };
}

async function render(changes: Partial<Task>, canBook = true): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    imports: [TaskDrawer],
    providers: [
      provideRouter([]),
      { provide: BoardService, useValue: {} },
      { provide: TeamContextService, useValue: { teamId: () => 'studio' } },
    ],
  });
  const card: BoardCard = {
    task: task(changes),
    project: { id: 'p', name: 'DJI0143', colour: '#3fa7a0', departmentId: 'dji', department: 'DJI' },
    assignee: priya,
    canEdit: true,
    done: false,
    approvable: false,
  };
  const fixture = TestBed.createComponent(TaskDrawer);
  fixture.componentRef.setInput('card', card);
  fixture.componentRef.setInput('people', [priya]);
  fixture.componentRef.setInput('canReassign', true);
  fixture.componentRef.setInput('canBook', canBook);
  await fixture.whenStable();
  return fixture.nativeElement;
}

/** The schedule actions above the task form. */
function actions(element: HTMLElement): string[] {
  return [...element.querySelectorAll('aside a, aside button')]
    .map((e) => e.textContent!.trim())
    .filter((text) => ['Book on schedule', 'View on schedule', 'Add booking'].includes(text));
}

describe('TaskDrawer schedule actions', () => {
  it('offers "Book on schedule" while the task has no booking', async () => {
    expect(actions(await render({}))).toEqual(['Book on schedule']);
  });

  it('offers "View on schedule", at the first booking\'s week, and "Add booking" while hours are left', async () => {
    const element = await render(booked(8));
    expect(actions(element)).toEqual(['View on schedule', 'Add booking']);
    const link = [...element.querySelectorAll('a')].find((a) => a.textContent!.includes('View on schedule'))!;
    expect(link.getAttribute('href')).toBe('/t/studio/capacity?week=2026-11-02');
  });

  it('hides "Add booking" once the bookings cover the estimate, but not without an estimate', async () => {
    expect(actions(await render(booked(16)))).toEqual(['View on schedule']);
    TestBed.resetTestingModule();
    expect(actions(await render({ ...booked(16), estimateHours: null }))).toEqual(['View on schedule', 'Add booking']);
  });

  it('offers no schedule actions to Members', async () => {
    expect(actions(await render(booked(8), false))).toEqual([]);
  });
});

describe('Booking defaults', () => {
  it('spread what is left of the estimate after the existing bookings', () => {
    expect(defaults(task({ estimateHours: 16 }))).toMatchObject({ days: 4, hoursPerDay: 4 });
    expect(defaults(task({ estimateHours: 16, bookedHours: 8 }))).toMatchObject({ days: 2, hoursPerDay: 4 });
  });
});
