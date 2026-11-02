import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Job, Person } from '../../core/models';
import { TeamContextService } from '../../core/team-context.service';
import { defaults } from './book-on-schedule';
import { toCard } from './job-card';
import { JobDrawer } from './job-drawer';
import { job } from './job.fixture';

const priya: Person = { id: 'p1', name: 'Priya Naidoo', avatarColour: '#5b8def', jobTitle: 'Junior Designer', hoursPerDay: 8 };

function booked(hours: number): Partial<Job> {
  return { bookedHours: hours, bookings: [{ personId: 'p1', personName: 'Priya Naidoo', startDate: '2026-11-04', endDate: '2026-11-05', hoursPerDay: 4, hours }] };
}

async function render(changes: Partial<Job>, canBook = true): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    imports: [JobDrawer],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { terms: signal({ department: 'Brand', brief: 'Brief', job: 'Job' }) } },
      { provide: TeamContextService, useValue: { teamId: () => 'studio' } },
    ],
  });
  const fixture = TestBed.createComponent(JobDrawer);
  fixture.componentRef.setInput('card', toCard(job(changes), new Map([[priya.id, priya]]), new Set()));
  fixture.componentRef.setInput('canBook', canBook);
  await fixture.whenStable();
  return fixture.nativeElement;
}

/** The schedule actions under the job's status. */
function actions(element: HTMLElement): string[] {
  return [...element.querySelectorAll('aside a, aside button')]
    .map((e) => e.textContent!.trim())
    .filter((text) => ['Book on schedule', 'View on schedule', 'Add booking'].includes(text));
}

describe('JobDrawer schedule actions', () => {
  it('offers "Book on schedule" while the job has no booking', async () => {
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

  it('offers no schedule actions without Allocate, nor on a closed job or one with no designer', async () => {
    expect(actions(await render(booked(8), false))).toEqual([]);
    TestBed.resetTestingModule();
    expect(actions(await render({ statusKind: 'Done', acceptsBookings: false }))).toEqual([]);
    TestBed.resetTestingModule();
    expect(actions(await render({ designerPersonId: null, designerName: null }))).toEqual([]);
  });
});

describe('Booking defaults', () => {
  it('spread what is left of the estimate after the existing bookings', () => {
    expect(defaults(job({ estimateHours: 16 }))).toMatchObject({ days: 4, hoursPerDay: 4 });
    expect(defaults(job({ estimateHours: 16, bookedHours: 8 }))).toMatchObject({ days: 2, hoursPerDay: 4 });
  });
});
