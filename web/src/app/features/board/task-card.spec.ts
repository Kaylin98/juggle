import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Task, TaskBooking } from '../../core/models';
import { TeamContextService } from '../../core/team-context.service';
import { BoardCard, TaskCard } from './task-card';

function booking(personName: string, startDate: string, endDate: string, hours: number): TaskBooking {
  return { personId: personName, personName, startDate, endDate, hoursPerDay: 4, hours };
}

function card(changes: Partial<Task>, done = false): BoardCard {
  const task: Task = {
    id: 't1',
    projectId: 'p',
    statusId: 's',
    title: 'Takealot banners',
    description: null,
    assigneePersonId: null,
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
  return { task, project: { id: 'p', name: 'DJI0143', colour: '#3fa7a0', departmentId: 'dji', department: 'DJI' }, assignee: null, canEdit: true, done, approvable: false };
}

describe('TaskCard booking chip', () => {
  async function render(boardCard: BoardCard, showBooking = true): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TeamContextService, useValue: { teamId: () => 'studio' } }],
    });
    const fixture = TestBed.createComponent(TaskCard);
    fixture.componentRef.setInput('card', boardCard);
    fixture.componentRef.setInput('showBooking', showBooking);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('shows the booked hours, linking to the schedule at the first booking\'s week', async () => {
    const element = await render(
      card({ bookedHours: 24, bookings: [booking('Priya Naidoo', '2026-11-04', '2026-11-09', 16), booking('Sipho Ndlovu', '2026-11-16', '2026-11-17', 8)] }),
    );
    const chip = element.querySelector('a')!;
    expect(chip.textContent!.trim()).toBe('Booked 24h');
    expect(chip.getAttribute('href')).toBe('/t/studio/capacity?week=2026-11-02');
  });

  it('shows a muted "Not booked", amber when due within 7 days', async () => {
    const quiet = await render(card({}));
    expect(quiet.querySelector('.bg-surface-muted')!.textContent!.trim()).toBe('Not booked');

    TestBed.resetTestingModule();
    const urgent = await render(card({ isDueSoon: true }));
    expect(urgent.querySelector('.bg-warn-50')!.textContent!.trim()).toBe('Not booked');
  });

  it('shows no chip on a done card, nor off the board', async () => {
    expect((await render(card({}, true))).textContent).not.toContain('booked');
    TestBed.resetTestingModule();
    expect((await render(card({}), false)).textContent).not.toContain('booked');
  });
});

describe('TaskCard approval', () => {
  it("offers the brand's manager Approve and Request changes, and no one else", async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TeamContextService, useValue: { teamId: () => 'studio' } }],
    });
    const fixture = TestBed.createComponent(TaskCard);
    fixture.componentRef.setInput('card', card({}));
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    // The first button is the card itself, under its content.
    const buttons = () => [...element.querySelectorAll('button')].map((b) => b.textContent!.trim());
    expect(buttons()).toEqual(['Takealot banners, DJI0143']);

    const events: string[] = [];
    fixture.componentInstance.approved.subscribe(() => events.push('approved'));
    fixture.componentInstance.changesRequested.subscribe(() => events.push('changes'));
    fixture.componentRef.setInput('card', { ...card({}), approvable: true });
    await fixture.whenStable();
    expect(buttons()).toEqual(['Takealot banners, DJI0143', 'Approve', 'Request changes']);
    element.querySelectorAll<HTMLButtonElement>('button')[1].click();
    element.querySelectorAll<HTMLButtonElement>('button')[2].click();
    expect(events).toEqual(['approved', 'changes']);
  });
});
