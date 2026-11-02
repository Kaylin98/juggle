import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { Job } from '../../core/models';
import { job } from '../board/job.fixture';
import { MyRequestsPage } from './my-requests';

async function render(mine: Job[]): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    imports: [MyRequestsPage],
    providers: [
      provideRouter([]),
      { provide: JobsService, useValue: { mine: () => Promise.resolve(mine), changes: () => 0 } },
      { provide: AuthService, useValue: { departmentLabel: signal('Brand'), terms: signal({ department: 'Brand', brief: 'Brief', job: 'Job' }) } },
    ],
  });
  const fixture = TestBed.createComponent(MyRequestsPage);
  await fixture.whenStable();
  return fixture.nativeElement;
}

describe('MyRequestsPage', () => {
  it('lists the jobs in the order given (newest first), each with its job ID and status, linking to its page', async () => {
    const page = await render([
      job({ id: 'j2', title: 'Roadshow deck', requiredDate: '2026-11-13', deadline: '2026-11-13', statusName: 'New Request' }),
      job({ id: 'j1', title: 'Brochure', statusName: 'In Progress' }),
    ]);

    const rows = [...page.querySelectorAll<HTMLAnchorElement>('li a')];
    expect(rows.map((row) => row.querySelector('.font-semibold')?.textContent?.trim())).toEqual(['Roadshow deck', 'Brochure']);
    expect(rows[0].getAttribute('href')).toBe('/requests/j2');
    expect(rows.map((row) => row.querySelector('app-status-chip')?.textContent?.trim())).toEqual(['New Request', 'In Progress']);
    expect(rows[0].textContent).toContain("DJI0143_Q1'27_Summer Holiday Sale");
    expect(rows[0].textContent).toContain('Design Studio');
    expect(rows[0].textContent).toContain('13 Nov 2026');
  });

  it('offers a new brief when there are none yet', async () => {
    const page = await render([]);

    expect(page.querySelector('.empty-state')?.textContent).toContain("You haven't sent a brief yet.");
    expect(page.querySelector('.empty-state a')?.getAttribute('href')).toBe('/request');
  });
});
