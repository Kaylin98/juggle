import { CdkDragDrop, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, ElementRef, computed, effect, inject, input, linkedSignal, resource, signal, viewChild } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { Task } from '../../core/models';
import { TeamContextService } from '../../core/team-context.service';
import { ToastService } from '../../shared/toast.service';
import { BoardColumn } from './board-column';
import { BoardFilters } from './board-filters';
import { BoardPrefsService } from './board-prefs.service';
import { BoardService } from './board.service';
import { collapsedColumns, toggleColumn } from './column-collapse';
import { columnWithout, moveTask, toColumnIndex } from './move-task';
import { BoardCard } from './task-card';
import { TaskDrawer } from './task-drawer';

@Component({
  selector: 'app-board-page',
  imports: [CdkDropListGroup, BoardColumn, BoardFilters, TaskDrawer],
  templateUrl: './board-page.html',
})
export class BoardPage {
  private readonly boardService = inject(BoardService);
  private readonly prefs = inject(BoardPrefsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly teamContext = inject(TeamContextService);

  /** From the `/t/:teamId/board` route. */
  readonly teamId = input.required<string>();

  protected readonly board = resource({
    params: () => this.teamId(),
    loader: ({ params }) => this.boardService.load(params),
  });

  protected readonly data = computed(() => (this.board.hasValue() ? this.board.value() : null));

  /** Updated in place on drag and save, so the board responds before the API does. */
  private readonly tasks = linkedSignal(() => this.data()?.tasks ?? []);

  protected readonly assigneeFilter = linkedSignal({ source: this.teamId, computation: () => '' });
  protected readonly projectFilter = linkedSignal({ source: this.teamId, computation: () => '' });
  protected readonly openTaskId = linkedSignal<string, string | null>({
    source: this.teamId,
    computation: () => null,
  });

  /** Columns the viewer collapsed by hand; they stay collapsed at any width and are remembered per user. */
  private readonly manuallyCollapsed = linkedSignal(() => {
    const userId = this.auth.me()?.id;
    return userId ? this.prefs.collapsedColumns(userId) : new Set<string>();
  });

  /** The columns as the viewer last left them by clicking; kept (the board scrolls) until the width changes. */
  private readonly heldByClick = linkedSignal<string, ReadonlySet<string> | null>({
    source: this.teamId,
    computation: () => null,
  });

  /** The board area's content width, kept up to date as the window resizes. */
  private readonly area = viewChild<ElementRef<HTMLElement>>('area');
  private readonly areaWidth = signal(0);

  constructor() {
    effect((onCleanup) => {
      const area = this.area()?.nativeElement;
      if (!area) return;
      const observer = new ResizeObserver(([entry]) => {
        if (entry.contentRect.width === this.areaWidth()) return;
        this.areaWidth.set(entry.contentRect.width);
        this.heldByClick.set(null);
      });
      observer.observe(area);
      onCleanup(() => observer.disconnect());
    });
  }

  private readonly cards = computed<BoardCard[]>(() => {
    const data = this.data();
    if (!data) return [];
    const projects = new Map(data.projects.map((p) => [p.id, p]));
    const people = new Map(data.people.map((p) => [p.id, p]));
    return this.tasks().map((task) => ({
      task,
      project: projects.get(task.projectId)!,
      assignee: task.assigneePersonId ? (people.get(task.assigneePersonId) ?? null) : null,
      canEdit: this.canEdit(task),
    }));
  });

  /** Every status except the first, Triage, which is handled in the triage inbox (D18). */
  protected readonly columns = computed(() => {
    const visible = this.cards()
      .filter((card) => this.matchesFilters(card.task))
      .sort((a, b) => a.task.sortOrder - b.task.sortOrder);
    return (this.data()?.statuses ?? []).slice(1).map((status) => ({
      status,
      cards: visible.filter((card) => card.task.statusId === status.id),
    }));
  });

  /**
   * Status ids of the collapsed columns: the viewer's own, plus as many more as it takes for the columns to fit.
   * After a click, the columns stay as the viewer left them until the next resize or page load.
   */
  protected readonly collapsed = computed(
    () =>
      this.heldByClick() ??
      collapsedColumns((this.data()?.statuses ?? []).slice(1), this.manuallyCollapsed(), this.areaWidth()),
  );

  protected readonly openCard = computed(
    () => this.cards().find((card) => card.task.id === this.openTaskId()) ?? null,
  );

  protected async drop(event: CdkDragDrop<string, string, Task>): Promise<void> {
    const task = event.item.data;
    const statusId = event.container.data;
    if (event.previousContainer === event.container && event.previousIndex === event.currentIndex) {
      return;
    }

    const column = columnWithout(this.tasks(), statusId, task.id);
    const visible = column.filter((t) => this.matchesFilters(t));
    const index = toColumnIndex(column, visible, event.currentIndex);
    this.tasks.update((tasks) => moveTask(tasks, task.id, statusId, index));

    try {
      this.replaceTask(await this.boardService.moveTask(task.id, statusId, index));
    } catch (error) {
      this.toast.error(error);
      this.board.reload();
    }
  }

  /** A manual collapse is remembered for this user; a manual expand holds only until the next resize. */
  protected toggleColumn(statusId: string): void {
    const next = toggleColumn(this.collapsed(), this.manuallyCollapsed(), statusId);
    this.heldByClick.set(next.collapsed);
    this.manuallyCollapsed.set(next.manual);
    this.prefs.saveCollapsedColumns(this.auth.me()!.id, next.manual);
  }

  protected onSaved(task: Task): void {
    this.replaceTask(task);
    this.openTaskId.set(null);
    this.toast.show('Task saved.');
  }

  /** Team Admins edit every task; Members only their own (D24). The API enforces the same rule. */
  private canEdit(task: Task): boolean {
    const personId = this.auth.me()?.personId;
    return this.teamContext.isTeamAdmin() || (personId != null && task.assigneePersonId === personId);
  }

  private matchesFilters(task: Task): boolean {
    const assignee = this.assigneeFilter();
    const project = this.projectFilter();
    return (!assignee || task.assigneePersonId === assignee) && (!project || task.projectId === project);
  }

  private replaceTask(saved: Task): void {
    this.tasks.update((tasks) => tasks.map((t) => (t.id === saved.id ? saved : t)));
  }
}
