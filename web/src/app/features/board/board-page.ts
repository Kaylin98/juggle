import { CdkDragDrop, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, ElementRef, computed, effect, inject, input, linkedSignal, resource, signal, viewChild } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { Task, WorkflowStatus } from '../../core/models';
import { TeamContextService } from '../../core/team-context.service';
import { Drawer } from '../../shared/drawer';
import { ToastService } from '../../shared/toast.service';
import { BoardColumn } from './board-column';
import { BoardFilters, matchesFilters } from './board-filters';
import { BoardPrefsService } from './board-prefs.service';
import { BoardService } from './board.service';
import { collapsedColumns, expandOnDrop, toggleColumn } from './column-collapse';
import { columnWithout, moveTask, toColumnIndex } from './move-task';
import { BoardCard } from './task-card';
import { NewTaskDrawer } from './new-task-drawer';
import { RequestChangesDialog } from './request-changes-dialog';
import { TaskDrawer } from './task-drawer';

@Component({
  selector: 'app-board-page',
  imports: [CdkDropListGroup, BoardColumn, BoardFilters, Drawer, NewTaskDrawer, RequestChangesDialog, TaskDrawer],
  templateUrl: './board-page.html',
})
export class BoardPage {
  private readonly boardService = inject(BoardService);
  private readonly prefs = inject(BoardPrefsService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly teamContext = inject(TeamContextService);

  /** From the `/t/:teamId/board` route. */
  readonly teamId = input.required<string>();

  /** `?due=overdue` (from the dashboard) opens the board showing only overdue tasks. */
  readonly due = input<string>();

  protected readonly board = resource({
    params: () => this.teamId(),
    loader: ({ params }) => this.boardService.load(params),
  });

  protected readonly data = computed(() => (this.board.hasValue() ? this.board.value() : null));

  /** Updated in place on drag and save, so the board responds before the API does. */
  private readonly tasks = linkedSignal(() => this.data()?.tasks ?? []);

  protected readonly assigneeFilter = linkedSignal({ source: this.teamId, computation: () => '' });
  protected readonly projectFilter = linkedSignal({ source: this.teamId, computation: () => '' });
  protected readonly dueFilter = linkedSignal({
    source: () => ({ teamId: this.teamId(), due: this.due() }),
    computation: ({ due }): string => (due === 'overdue' ? due : ''),
  });
  protected readonly bookingFilter = linkedSignal({ source: this.teamId, computation: () => '' });
  protected readonly openTaskId = linkedSignal<string, string | null>({
    source: this.teamId,
    computation: () => null,
  });

  /**
   * The column a new task is being added to, or null. Everyone who can see a board is in its team (Org Admins act
   * as Team Admins); Members add tasks only for themselves, so a brand's marketing manager, who has no Person, cannot.
   */
  protected readonly addingTo = linkedSignal<string, WorkflowStatus | null>({
    source: this.teamId,
    computation: () => null,
  });

  protected readonly canAdd = computed(() => this.teamContext.isTeamAdmin() || this.auth.me()?.personId != null);

  /** The card its brand's manager is sending back for changes, or null (D58). */
  protected readonly changesFor = linkedSignal<string, string | null>({
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

  /** The Done-category columns: their cards show no booking chip and are never "not booked" (D57). */
  private readonly doneStatusIds = computed(
    () => new Set((this.data()?.statuses ?? []).filter((s) => s.category === 'Done').map((s) => s.id)),
  );

  /**
   * The approval column: the last of two or more review columns (Awaiting approval for the Studio), where the
   * brand's manager approves or sends back a card (D58). Null on a board without one.
   */
  private readonly approvalStatusId = computed(() => {
    const review = (this.data()?.statuses ?? []).filter((s) => s.category === 'Review');
    return review.length >= 2 ? review[review.length - 1].id : null;
  });

  private readonly cards = computed<BoardCard[]>(() => {
    const data = this.data();
    if (!data) return [];
    const projects = new Map(data.projects.map((p) => [p.id, p]));
    const people = new Map(data.people.map((p) => [p.id, p]));
    const managed = this.auth.managedDepartmentIds();
    return this.tasks().map((task) => {
      const project = projects.get(task.projectId)!;
      return {
        task,
        project,
        assignee: task.assigneePersonId ? (people.get(task.assigneePersonId) ?? null) : null,
        canEdit: this.canEdit(task),
        done: this.doneStatusIds().has(task.statusId),
        approvable: task.statusId === this.approvalStatusId() && managed.has(project.departmentId),
      };
    });
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
      collapsedColumns((this.data()?.statuses ?? []).slice(1), this.manuallyCollapsed(), this.areaWidth(), this.emptyWhileFiltered()),
  );

  /** Columns a filter leaves empty; they collapse first so the matching cards stay in view. */
  private readonly emptyWhileFiltered = computed(
    () => new Set(this.filtered() ? this.columns().filter((c) => c.cards.length === 0).map((c) => c.status.id) : []),
  );

  protected readonly filtered = computed(
    () => !!(this.assigneeFilter() || this.projectFilter() || this.dueFilter() || this.bookingFilter()),
  );

  protected readonly openCard = computed(
    () => this.cards().find((card) => card.task.id === this.openTaskId()) ?? null,
  );

  protected readonly changesCard = computed(
    () => this.cards().find((card) => card.task.id === this.changesFor()) ?? null,
  );

  /** Approved cards go to the top of Done; the board reloads for the new order. */
  protected async approve(task: Task): Promise<void> {
    try {
      await this.boardService.approve(task.id);
      this.toast.show('Approved.', 'success');
    } catch (error) {
      this.toast.error(error);
    }
    this.board.reload();
  }

  protected onChangesSent(): void {
    this.changesFor.set(null);
    this.toast.show('Sent back for changes.', 'success');
    this.board.reload();
  }

  protected async drop(event: CdkDragDrop<string, string, Task>): Promise<void> {
    const task = event.item.data;
    const statusId = event.container.data;
    if (event.previousContainer === event.container && event.previousIndex === event.currentIndex) {
      return;
    }

    if (this.collapsed().has(statusId)) {
      this.heldByClick.set(expandOnDrop(this.collapsed(), statusId));
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

  protected onCreated(task: Task): void {
    this.tasks.update((tasks) => [...tasks, task]);
    this.addingTo.set(null);
    this.toast.show('Task added.');
  }

  /** Team Admins edit every task; Members only their own (D24). The API enforces the same rule. */
  private canEdit(task: Task): boolean {
    const personId = this.auth.me()?.personId;
    return this.teamContext.isTeamAdmin() || (personId != null && task.assigneePersonId === personId);
  }

  private matchesFilters(task: Task): boolean {
    return matchesFilters(task, {
      assigneeId: this.assigneeFilter(),
      projectId: this.projectFilter(),
      due: this.dueFilter(),
      booking: this.bookingFilter(),
      doneStatusIds: this.doneStatusIds(),
    });
  }

  private replaceTask(saved: Task): void {
    this.tasks.update((tasks) => tasks.map((t) => (t.id === saved.id ? saved : t)));
  }
}
