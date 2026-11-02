import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Job } from '../../core/models';
import { TeamContextService } from '../../core/team-context.service';
import { BoardCard, JobCard, toCard } from './job-card';
import { booking, job } from './job.fixture';

function card(changes: Partial<Job>, scheduled = false): BoardCard {
  return toCard(job(changes), new Map(), new Set(scheduled ? [changes.statusId ?? 'in-progress'] : []));
}

async function render(boardCard: BoardCard, showBooking = true): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: TeamContextService, useValue: { teamId: () => 'studio' } }],
  });
  const fixture = TestBed.createComponent(JobCard);
  fixture.componentRef.setInput('card', boardCard);
  fixture.componentRef.setInput('showBooking', showBooking);
  await fixture.whenStable();
  return fixture.nativeElement;
}

describe('JobCard', () => {
  it('shows the job ID, the job name and its detailed status in the status hue', async () => {
    const element = await render(card({ statusName: 'Awaiting Design Approval', statusColour: '#d9a441' }));
    expect(element.textContent).toContain("DJI0143_Q1'27_Summer Holiday Sale");
    expect(element.textContent).toContain('Summer Holiday Sale');
    const chip = element.querySelector<HTMLElement>('app-status-chip')!;
    expect(chip.textContent!.trim()).toBe('Awaiting Design Approval');
    expect(chip.style.getPropertyValue('--hue')).toBe('#d9a441');
  });

  it('shows "Starts" its planned start only in a scheduled status (D76)', async () => {
    expect((await render(card({ plannedStartDate: '2026-11-09' }, true))).textContent).toContain('Starts 9 Nov');
    TestBed.resetTestingModule();
    expect((await render(card({ plannedStartDate: '2026-11-09' }))).textContent).not.toContain('Starts');
  });
});

describe('JobCard drag and due date', () => {
  it('shows a grip only on a card the user can act on', async () => {
    const boardCard = card({ actions: ['Start'] });
    expect((await render(boardCard)).querySelector('svg')).toBeNull();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TeamContextService, useValue: { teamId: () => 'studio' } }],
    });
    const fixture = TestBed.createComponent(JobCard);
    fixture.componentRef.setInput('card', boardCard);
    fixture.componentRef.setInput('canDrag', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('svg')).not.toBeNull();
  });

  it('shows an overdue required date in red', async () => {
    const element = await render(card({ requiredDate: '2026-10-30', isOverdue: true }));
    expect(element.querySelector('app-due-date span')!.className).toContain('text-over-700');
  });
});

describe('JobCard booking chip', () => {
  it("shows the booked hours, linking to the schedule at the first booking's week", async () => {
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

  it('shows no chip on a closed or cancelled job, nor off the board', async () => {
    expect((await render(card({ statusKind: 'Done' }))).textContent).not.toContain('booked');
    TestBed.resetTestingModule();
    expect((await render(card({ statusKind: 'Cancelled' }))).textContent).not.toContain('booked');
    TestBed.resetTestingModule();
    expect((await render(card({}), false)).textContent).not.toContain('booked');
  });
});
