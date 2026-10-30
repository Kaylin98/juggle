import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { CreateTask, Person, Project, Task, UpdateTask, WorkflowStatus } from '../../core/models';

export interface Board {
  statuses: WorkflowStatus[];
  projects: Project[];
  people: Person[];
  tasks: Task[];
}

@Injectable({ providedIn: 'root' })
export class BoardService {
  private readonly http = inject(HttpClient);

  load(teamId: string): Promise<Board> {
    return firstValueFrom(
      forkJoin({
        statuses: this.http.get<WorkflowStatus[]>(`/api/teams/${teamId}/statuses`),
        projects: this.http.get<Project[]>(`/api/teams/${teamId}/projects`),
        people: this.http.get<Person[]>(`/api/teams/${teamId}/people`),
        tasks: this.http.get<Task[]>(`/api/teams/${teamId}/tasks`),
      }),
    );
  }

  createTask(teamId: string, task: CreateTask): Promise<Task> {
    return firstValueFrom(this.http.post<Task>(`/api/teams/${teamId}/tasks`, task));
  }

  updateTask(id: string, changes: UpdateTask): Promise<Task> {
    return firstValueFrom(this.http.put<Task>(`/api/tasks/${id}`, changes));
  }

  moveTask(id: string, statusId: string, index: number): Promise<Task> {
    return firstValueFrom(this.http.post<Task>(`/api/tasks/${id}/move`, { statusId, index }));
  }
}
