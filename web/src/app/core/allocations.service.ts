import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SaveAllocation, SavedAllocation } from './models';

/** Books people onto jobs. Used by the schedule and by "Book on schedule" in the job drawer. */
@Injectable({ providedIn: 'root' })
export class AllocationsService {
  private readonly http = inject(HttpClient);

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
