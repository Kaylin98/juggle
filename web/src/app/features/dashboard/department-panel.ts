import { Component, computed, input } from '@angular/core';
import { DepartmentCount } from '../../core/models';

/** Open tasks by their project's department (D27), as bars against the largest. */
@Component({
  selector: 'app-department-panel',
  host: { class: 'panel block p-6' },
  template: `
    <h2 class="font-display text-lg font-semibold">Work by department</h2>
    <p class="mt-1 text-sm text-ink-muted">Open tasks, by the department each project is for</p>

    <ul class="mt-6 space-y-4">
      @for (item of departments(); track item.department) {
        <li>
          <div class="flex items-baseline justify-between gap-4 text-sm">
            <span class="font-semibold">{{ item.department }}</span>
            <span class="text-ink-muted">{{ item.count }} {{ item.count === 1 ? 'task' : 'tasks' }}</span>
          </div>
          <div class="mt-2 h-2 rounded-full bg-surface-muted">
            <div class="h-full rounded-full bg-ink-faint" [style.width.%]="(item.count / largest()) * 100"></div>
          </div>
        </li>
      } @empty {
        <li class="text-sm text-ink-muted">No open tasks.</li>
      }
    </ul>
  `,
})
export class DepartmentPanel {
  readonly departments = input.required<DepartmentCount[]>();

  protected readonly largest = computed(() => Math.max(1, ...this.departments().map((d) => d.count)));
}
