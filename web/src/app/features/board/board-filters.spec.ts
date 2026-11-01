import { JobFilters, matchesFilters } from './board-filters';
import { booking, job } from './job.fixture';

describe('matchesFilters', () => {
  const jobs = [
    job({ id: 'late', designerPersonId: 'priya', isOverdue: true }),
    job({ id: 'on-time', designerPersonId: 'priya', bookings: [booking('Priya Naidoo', '2026-11-02', '2026-11-05', 16)] }),
    job({ id: 'late-other', designerPersonId: 'sipho', departmentId: 'gopro', isOverdue: true }),
    job({ id: 'closed', designerPersonId: 'sipho', statusKind: 'Done' }),
  ];
  const none: JobFilters = { designerId: '', departmentId: '', due: '', booking: '' };
  const shown = (filters: Partial<JobFilters>) => jobs.filter((j) => matchesFilters(j, { ...none, ...filters })).map((j) => j.id);

  it('shows every job with no filters', () => {
    expect(shown({})).toEqual(['late', 'on-time', 'late-other', 'closed']);
  });

  it('filters by designer and by brand', () => {
    expect(shown({ designerId: 'sipho' })).toEqual(['late-other', 'closed']);
    expect(shown({ departmentId: 'gopro' })).toEqual(['late-other']);
  });

  it('shows only overdue jobs for "overdue", combined with the other filters', () => {
    expect(shown({ due: 'overdue' })).toEqual(['late', 'late-other']);
    expect(shown({ designerId: 'priya', due: 'overdue' })).toEqual(['late']);
  });

  it('shows only open jobs without a booking for "Not booked"', () => {
    expect(shown({ booking: 'unbooked' })).toEqual(['late', 'late-other']);
    expect(shown({ designerId: 'priya', booking: 'unbooked' })).toEqual(['late']);
  });
});
