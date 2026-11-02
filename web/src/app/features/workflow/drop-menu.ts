import { Component, computed, inject, input, output } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { WorkflowAction } from '../../core/models';
import { actionLabels } from './action-labels';

/** The actions a card dropped on a column could run, as a small menu at the drop point. */
@Component({
  selector: 'app-drop-menu',
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <button
      type="button"
      class="fixed inset-0 z-40 cursor-default"
      aria-label="Close the menu"
      (click)="closed.emit()"
    ></button>
    <ul
      role="menu"
      class="fixed z-50 min-w-48 rounded-control bg-surface p-1 shadow-raised"
      [style.left.px]="left()"
      [style.top.px]="top()"
    >
      @for (action of actions(); track action) {
        <li role="none">
          <button
            type="button"
            role="menuitem"
            class="w-full rounded-control px-3 py-2 text-left text-sm font-semibold hover:bg-surface-muted focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
            (click)="chosen.emit(action)"
          >
            {{ labels()[action] }}
          </button>
        </li>
      }
    </ul>
  `,
})
export class DropMenu {
  private readonly auth = inject(AuthService);

  readonly actions = input.required<WorkflowAction[]>();
  readonly point = input.required<{ x: number; y: number }>();
  readonly chosen = output<WorkflowAction>();
  readonly closed = output<void>();

  protected readonly labels = computed(() => actionLabels(this.auth.terms()));

  /** Kept inside the window: the menu is about 12rem wide and 2.5rem a row. */
  protected readonly left = computed(() => Math.min(this.point().x, window.innerWidth - 220));
  protected readonly top = computed(() =>
    Math.min(this.point().y, window.innerHeight - 16 - this.actions().length * 40),
  );
}
