import { TestBed } from '@angular/core/testing';
import { TimeOffService } from '../../core/time-off.service';
import { AllocationPopover, BookingDraft } from './allocation-popover';

const DRAFT: BookingDraft = { allocation: null, personId: 'lerato', personName: 'Lerato Mokoena', startDate: '2026-11-12', endDate: '2026-11-13' };

async function render(canBook: boolean, ownPersonId: string) {
  TestBed.configureTestingModule({ providers: [{ provide: TimeOffService, useValue: {} }] });
  const fixture = TestBed.createComponent(AllocationPopover);
  fixture.componentRef.setInput('draft', DRAFT);
  fixture.componentRef.setInput('jobs', []);
  fixture.componentRef.setInput('canBook', canBook);
  fixture.componentRef.setInput('ownPersonId', ownPersonId);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const tab = (name: string) => [...element.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((t) => t.textContent!.trim() === name)!;
  return { element, tab };
}

describe('AllocationPopover', () => {
  it('opens a Member\'s own row on Time off, for the days picked, and no booking', async () => {
    const { element, tab } = await render(false, 'lerato');

    expect(element.querySelector('h2')!.textContent).toBe('Time off');
    expect(tab('Booking').disabled).toBe(true);
    expect(tab('Time off').getAttribute('aria-selected')).toBe('true');
    // The days picked on the grid, shown under the heading as for a booking; no date fields.
    expect(element.querySelector('p')!.textContent).toContain('Thu 12 Nov – Fri 13 Nov');
    expect(element.querySelector('app-time-off-form')).not.toBeNull();
    expect(element.querySelector('#time-off-start')).toBeNull();
  });

  it('lets a Team Admin book on someone else\'s row, but not ask for time off for them', async () => {
    const { element, tab } = await render(true, 'naledi');

    expect(element.querySelector('h2')!.textContent).toBe('New booking');
    expect(tab('Booking').getAttribute('aria-selected')).toBe('true');
    expect(tab('Time off').disabled).toBe(true);
    expect(element.querySelector('app-time-off-form')).toBeNull();
  });

  it('offers both on a Team Admin\'s own row', async () => {
    const { tab } = await render(true, 'lerato');

    expect([tab('Booking').disabled, tab('Time off').disabled]).toEqual([false, false]);
  });
});
