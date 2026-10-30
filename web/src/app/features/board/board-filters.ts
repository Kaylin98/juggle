import { Component, computed, input, model } from '@angular/core';
import { Person, Project, Task } from '../../core/models';
import { Select, SelectOption } from '../../shared/select';

const DUE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Any date' },
  { value: 'overdue', label: 'Overdue' },
];

/** Assignee, project and due date filters. An empty value means "all". */
@Component({
  selector: 'app-board-filters',
  imports: [Select],
  host: { class: 'flex items-center gap-6' },
  template: `
    <label class="flex items-center gap-3">
      <span class="label-caps">Assignee</span>
      <app-select variant="pill" [options]="assigneeOptions()" [(value)]="assigneeId" />
    </label>
    <label class="flex items-center gap-3">
      <span class="label-caps">Project</span>
      <app-select variant="pill" [options]="projectOptions()" [(value)]="projectId" />
    </label>
    <label class="flex items-center gap-3">
      <span class="label-caps">Due</span>
      <app-select variant="pill" [options]="dueOptions" [(value)]="due" />
    </label>
    @if (assigneeId() || projectId() || due()) {
      <button type="button" class="btn-quiet" (click)="clear()">Clear</button>
    }
  `,
})
export class BoardFilters {
  readonly people = input.required<Person[]>();
  readonly projects = input.required<Project[]>();
  readonly assigneeId = model.required<string>();
  readonly projectId = model.required<string>();
  /** "overdue" shows only tasks due before today that are not done. */
  readonly due = model.required<string>();

  protected readonly dueOptions = DUE_OPTIONS;

  protected readonly assigneeOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Everyone' },
    ...this.people().map((p) => ({ value: p.id, label: p.name, avatarColour: p.avatarColour })),
  ]);

  protected readonly projectOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All projects' },
    ...this.projects().map((p) => ({ value: p.id, label: p.name, colour: p.colour })),
  ]);

  protected clear(): void {
    this.assigneeId.set('');
    this.projectId.set('');
    this.due.set('');
  }
}

export interface TaskFilters {
  assigneeId: string;
  projectId: string;
  due: string;
}

export function matchesFilters(task: Task, filters: TaskFilters): boolean {
  return (
    (!filters.assigneeId || task.assigneePersonId === filters.assigneeId) &&
    (!filters.projectId || task.projectId === filters.projectId) &&
    (filters.due !== 'overdue' || task.isOverdue)
  );
}
