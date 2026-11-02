import { Job, JobBooking } from '../../core/models';

/** A job for specs: DJI's next job, open, unbooked and with no dates unless changed. */
export function job(changes: Partial<Job> = {}): Job {
  return {
    id: 'j1',
    teamId: 'studio',
    teamName: 'Design Studio',
    code: "DJI0143_Q1'27_Summer Holiday Sale",
    title: 'Summer Holiday Sale',
    departmentId: 'dji',
    department: 'DJI',
    colour: '#5b8def',
    requesterName: 'Zanele Mthembu',
    statusId: 'in-progress',
    columnId: 'in-design',
    statusName: 'In Progress',
    statusColour: '#5b8def',
    statusKind: 'Open',
    priority: 'High',
    requiredDate: null,
    deadline: null,
    createdAt: '2026-11-01T09:00:00Z',
    purpose: null,
    deliverables: [],
    designerPersonId: 'p1',
    designerName: 'Priya Naidoo',
    estimateHours: 16,
    plannedStartDate: null,
    expectedCompletionDate: null,
    isOverdue: false,
    isDueSoon: false,
    acceptsBookings: true,
    bookedHours: 0,
    bookings: [],
    actions: [],
    revisionCount: 0,
    ...changes,
  };
}

export function booking(personName: string, startDate: string, endDate: string, hours: number): JobBooking {
  return { personId: personName, personName, startDate, endDate, hoursPerDay: 4, hours };
}
