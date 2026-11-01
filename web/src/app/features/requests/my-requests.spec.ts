import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { WorkRequest } from '../../core/models';
import { RequestsService } from '../../core/requests.service';
import { MyRequestsPage } from './my-requests';

function request(id: string, title: string, status: WorkRequest['status']): WorkRequest {
  return {
    id,
    teamId: 'design',
    teamName: 'Design',
    title,
    mainGoal: null,
    deliverables: [],
    department: 'Sales',
    requesterName: 'David Cohen',
    requestedDueDate: '2026-11-13',
    priority: 'High',
    status,
    taskId: null,
    rejectionReason: null,
    createdAt: '2026-10-30T10:00:00Z',
    assigneeName: null,
    committedDueDate: null,
  };
}

async function render(mine: WorkRequest[]): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    imports: [MyRequestsPage],
    providers: [
      provideRouter([]),
      { provide: RequestsService, useValue: { mine: () => Promise.resolve(mine) } },
      { provide: AuthService, useValue: { departmentLabel: signal('Brand') } },
    ],
  });
  const fixture = TestBed.createComponent(MyRequestsPage);
  await fixture.whenStable();
  return fixture.nativeElement;
}

describe('MyRequestsPage', () => {
  it('lists the requests in the order given (newest first), each linking to its detail', async () => {
    const page = await render([request('r2', 'Roadshow deck', 'New'), request('r1', 'Brochure', 'Accepted')]);

    const rows = [...page.querySelectorAll<HTMLAnchorElement>('li a')];
    expect(rows.map((row) => row.querySelector('.font-semibold')?.textContent?.trim())).toEqual(['Roadshow deck', 'Brochure']);
    expect(rows[0].getAttribute('href')).toBe('/requests/r2');
    expect(rows.map((row) => row.querySelector('app-status-pill')?.textContent?.trim())).toEqual(['New', 'Accepted']);
    expect(rows[0].textContent).toContain('Design');
    expect(rows[0].textContent).toContain('13 Nov 2026');
  });

  it('offers a new request when there are none yet', async () => {
    const page = await render([]);

    expect(page.querySelector('.empty-state')?.textContent).toContain("You haven't asked a team for work yet.");
    expect(page.querySelector('.empty-state a')?.getAttribute('href')).toBe('/request');
  });
});
