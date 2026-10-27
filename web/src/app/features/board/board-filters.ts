import { Component, input, model } from '@angular/core';
import { Person, Project } from '../../core/models';
import { SelectChevron } from '../../shared/select-chevron';

/** Assignee and project filters. An empty id means "all". */
@Component({
  selector: 'app-board-filters',
  imports: [SelectChevron],
  host: { class: 'flex items-center gap-4' },
  template: `
    <label class="flex items-center gap-2 text-sm">
      <span class="text-slate-500">Assignee</span>
      <span class="relative">
        <select class="compact-select peer" (change)="assigneeId.set($any($event.target).value)">
          <option value="" [selected]="assigneeId() === ''">Everyone</option>
          @for (person of people(); track person.id) {
            <option [value]="person.id" [selected]="person.id === assigneeId()">{{ person.name }}</option>
          }
        </select>
        <app-select-chevron />
      </span>
    </label>
    <label class="flex items-center gap-2 text-sm">
      <span class="text-slate-500">Project</span>
      <span class="relative">
        <select class="compact-select peer" (change)="projectId.set($any($event.target).value)">
          <option value="" [selected]="projectId() === ''">All projects</option>
          @for (project of projects(); track project.id) {
            <option [value]="project.id" [selected]="project.id === projectId()">{{ project.name }}</option>
          }
        </select>
        <app-select-chevron />
      </span>
    </label>
    @if (assigneeId() || projectId()) {
      <button type="button" class="text-sm font-medium text-accent-600 hover:text-accent-700" (click)="clear()">
        Clear
      </button>
    }
  `,
})
export class BoardFilters {
  readonly people = input.required<Person[]>();
  readonly projects = input.required<Project[]>();
  readonly assigneeId = model.required<string>();
  readonly projectId = model.required<string>();

  protected clear(): void {
    this.assigneeId.set('');
    this.projectId.set('');
  }
}
