import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AllocationCheck,
  CheckAllocation,
  PersonAvailability,
  ReassignedJob,
  SaveAllocation,
  SavedAllocation,
} from './models';

/** Books people onto jobs. Used by the schedule and by "Book on schedule" in the job drawer. */
@Injectable({ providedIn: 'root' })
export class AllocationsService {
  private readonly http = inject(HttpClient);

  /** What a booking would run into, before it is saved. */
  check(booking: CheckAllocation): Promise<AllocationCheck> {
    const { exceptAllocationId, ...rest } = booking;
    return firstValueFrom(
      this.http.get<AllocationCheck>('/api/allocations/check', {
        params: { ...rest, ...(exceptAllocationId ? { exceptAllocationId } : {}) },
      }),
    );
  }

  /** The hours each person in the team has free from the start to the end date. */
  availability(teamId: string, startDate: string, endDate: string): Promise<PersonAvailability[]> {
    return firstValueFrom(
      this.http.get<PersonAvailability[]>('/api/allocations/availability', {
        params: { teamId, startDate, endDate },
      }),
    );
  }

  /** Moves the job, with all its bookings, to another designer. */
  reassign(jobId: string, personId: string): Promise<ReassignedJob> {
    return firstValueFrom(this.http.post<ReassignedJob>(`/api/jobs/${jobId}/reassign`, { personId }));
  }

  create(allocation: SaveAllocation): Promise<SavedAllocation> {
    return firstValueFrom(this.http.post<SavedAllocation>('/api/allocations', allocation));
  }

  update(id: string, allocation: SaveAllocation): Promise<SavedAllocation> {
    return firstValueFrom(this.http.put<SavedAllocation>(`/api/allocations/${id}`, allocation));
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/allocations/${id}`));
  }
}
