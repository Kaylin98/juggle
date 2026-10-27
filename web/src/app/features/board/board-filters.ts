import { Component, computed, input, model } from '@angular/core';
import { Person, Project } from '../../core/models';
import { Select, SelectOption } from '../../shared/select';

/** Assignee and project filters. An empty id means "all". */
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
    @if (assigneeId() || projectId()) {
      <button type="button" class="btn-quiet" (click)="clear()">Clear</button>
    }
  `,
})
export class BoardFilters {
  readonly people = input.required<Person[]>();
  readonly projects = input.required<Project[]>();
  readonly assigneeId = model.required<string>();
  readonly projectId = model.required<string>();

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
  }
}
