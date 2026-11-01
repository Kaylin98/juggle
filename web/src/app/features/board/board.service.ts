import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { Job, Person, Workflow } from '../../core/models';

export interface Board {
  workflow: Workflow;
  people: Person[];
  jobs: Job[];
}

@Injectable({ providedIn: 'root' })
export class BoardService {
  private readonly http = inject(HttpClient);

  /** The organisation's columns, the team's people, and the team's jobs the viewer may see. */
  load(teamId: string): Promise<Board> {
    return firstValueFrom(
      forkJoin({
        workflow: this.http.get<Workflow>('/api/workflow'),
        people: this.http.get<Person[]>(`/api/teams/${teamId}/people`),
        jobs: this.http.get<Job[]>(`/api/teams/${teamId}/jobs`),
      }),
    );
  }
}
