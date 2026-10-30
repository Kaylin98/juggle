import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FormField, disabled, form, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { Person, Project, Task, WorkflowStatus } from '../../core/models';
import { Drawer } from '../../shared/drawer';
import { Select, SelectOption } from '../../shared/select';
import { ToastService } from '../../shared/toast.service';
import { BoardService } from './board.service';

/** Form fields as the inputs hold them: empty strings for blank values. */
interface NewTaskForm {
  title: string;
  projectId: string;
  assigneePersonId: string;
  estimateHours: number | null;
  dueDate: string;
  link: string;
}

/**
 * The task drawer in create mode: adds a task to the end of a board column. Team Admins assign anyone or no one;
 * Members only themselves (`ownPersonId` set), so they can edit the task afterwards. The API enforces the same rule.
 */
@Component({
  selector: 'app-new-task-drawer',
  imports: [Drawer, FormField, Select],
  template: `
    <app-drawer heading="New task" (closed)="closed.emit()">
      <form class="flex min-h-full flex-col" novalidate (submit)="create($event)">
        <div class="flex-1 space-y-6 px-6 pt-2 pb-6">
          <p class="text-sm text-ink-muted">
            Adds to <span class="font-semibold text-ink">{{ status().name }}</span>
          </p>

          <div>
            <label class="form-label" for="new-task-title">Title</label>
            <input id="new-task-title" class="form-input" [formField]="taskForm.title" />
            @if (taskForm.title().touched() && taskForm.title().invalid()) {
              <p class="field-error">{{ taskForm.title().errors()[0].message }}</p>
            }
          </div>

          <div>
            <label class="form-label" for="new-task-project">Project</label>
            <app-select triggerId="new-task-project" [options]="projectOptions()" [formField]="taskForm.projectId" />
            @if (taskForm.projectId().touched() && taskForm.projectId().invalid()) {
              <p class="field-error">{{ taskForm.projectId().errors()[0].message }}</p>
            }
          </div>

          <div>
            <label class="form-label" for="new-task-assignee">Assignee</label>
            <app-select triggerId="new-task-assignee" [options]="assigneeOptions()" [formField]="taskForm.assigneePersonId" />
            @if (ownPersonId()) {
              <p class="mt-2 text-xs text-ink-muted">Tasks you add are assigned to you.</p>
            }
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label" for="new-task-estimate">Estimate (hours)</label>
              <input id="new-task-estimate" class="form-input" type="number" step="0.5" [formField]="taskForm.estimateHours" />
              @if (taskForm.estimateHours().touched() && taskForm.estimateHours().invalid()) {
                <p class="field-error">{{ taskForm.estimateHours().errors()[0].message }}</p>
              }
            </div>
            <div>
              <label class="form-label" for="new-task-due">Due date</label>
              <input id="new-task-due" class="form-input" type="date" [formField]="taskForm.dueDate" />
            </div>
          </div>

          <div>
            <label class="form-label" for="new-task-link">Link</label>
            <input id="new-task-link" class="form-input" type="url" placeholder="https://" [formField]="taskForm.link" />
            @if (taskForm.link().touched() && taskForm.link().invalid()) {
              <p class="field-error">{{ taskForm.link().errors()[0].message }}</p>
            }
          </div>
        </div>

        <footer class="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-surface px-6 py-4">
          <button type="button" class="btn-secondary" (click)="closed.emit()">Cancel</button>
          <button type="submit" class="btn-primary" [disabled]="taskForm().submitting()">Add task</button>
        </footer>
      </form>
    </app-drawer>
  `,
})
export class NewTaskDrawer {
  private readonly boardService = inject(BoardService);
  private readonly toast = inject(ToastService);

  readonly teamId = input.required<string>();
  /** The column the task goes in. */
  readonly status = input.required<WorkflowStatus>();
  readonly projects = input.required<Project[]>();
  readonly people = input.required<Person[]>();
  /** Set for Members: the task is assigned to them and the assignee cannot be changed. */
  readonly ownPersonId = input<string | null>(null);
  readonly closed = output<void>();
  readonly created = output<Task>();

  protected readonly projectOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Choose a project' },
    ...this.projects().map((p) => ({ value: p.id, label: p.name, colour: p.colour })),
  ]);

  protected readonly assigneeOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Unassigned' },
    ...this.people().map((p) => ({ value: p.id, label: p.name, avatarColour: p.avatarColour })),
  ]);

  protected readonly model = linkedSignal<NewTaskForm>(() => ({
    title: '',
    projectId: '',
    assigneePersonId: this.ownPersonId() ?? '',
    estimateHours: null,
    dueDate: '',
    link: '',
  }));

  protected readonly taskForm = form(this.model, (task) => {
    disabled(task.assigneePersonId, () => this.ownPersonId() !== null);
    required(task.title, { message: 'Enter a title.' });
    maxLength(task.title, 200, { message: 'Keep the title under 200 characters.' });
    required(task.projectId, { message: 'Choose the project this work is for.' });
    min(task.estimateHours, 0, { message: 'The estimate cannot be negative.' });
    max(task.estimateHours, 999, { message: 'The estimate must be under 1000 hours.' });
    maxLength(task.link, 1000, { message: 'Keep the link under 1000 characters.' });
  });

  protected async create(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.taskForm, async () => {
      const value = this.model();
      try {
        this.created.emit(
          await this.boardService.createTask(this.teamId(), {
            title: value.title.trim(),
            projectId: value.projectId,
            statusId: this.status().id,
            assigneePersonId: value.assigneePersonId || null,
            estimateHours: value.estimateHours,
            dueDate: value.dueDate || null,
            link: value.link.trim() || null,
          }),
        );
      } catch (error) {
        this.toast.error(error);
      }
      return undefined;
    });
  }
}
