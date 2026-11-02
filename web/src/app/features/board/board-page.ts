import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { Job, WorkflowAction } from '../../core/models';
import { TeamContextService } from '../../core/team-context.service';
import { BrandLegend, legendBrands } from '../../shared/brand-legend';
import { ToastService } from '../../shared/toast.service';
import { ActionRunner } from '../workflow/action-runner';
import { ONE_CLICK_ACTIONS, actionLabels } from '../workflow/action-labels';
import { DropMenu } from '../workflow/drop-menu';
import { actionsLeadingTo, dropOutcome } from '../workflow/drop-outcome';
import { BoardColumn } from './board-column';
import { BoardFilters, matchesFilters } from './board-filters';
import { BoardPrefsService } from './board-prefs.service';
import { BoardService } from './board.service';
import { collapsedColumns, toggleColumn } from './column-collapse';
import { BoardCard, toCard } from './job-card';
import { JobDrawer } from './job-drawer';

/**
 * The board (D64): the organisation's columns, each with its jobs in status order, then by required date. Users who
 * see all the work see every job; anyone else sees their own (D70). Cards open the job; they move through workflow
 * actions, which come in Phase W, not by dragging.
 */
@Component({
  selector: 'app-board-page',
  imports: [BoardColumn, BoardFilters, BrandLegend, DropMenu, JobDrawer],
  templateUrl: './board-page.html',
})
export class BoardPage {
  private readonly boardService = inject(BoardService);
  private readonly prefs = inject(BoardPrefsService);
  private readonly runner = inject(ActionRunner);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly teamContext = inject(TeamContextService);

  /** From the `/t/:teamId/board` route. */
  readonly teamId = input.required<string>();

  /** `?due=overdue` (from the dashboard) opens the board showing only overdue jobs. */
  readonly due = input<string>();

  protected readonly board = resource({
    params: () => this.teamId(),
    loader: ({ params }) => this.boardService.load(params),
  });

  protected readonly data = computed(() => (this.board.hasValue() ? this.board.value() : null));

  protected readonly designerFilter = linkedSignal({ source: this.teamId, computation: () => '' });
  protected readonly departmentFilter = linkedSignal({
    source: this.teamId,
    computation: () => '',
  });
  protected readonly dueFilter = linkedSignal({
    source: () => ({ teamId: this.teamId(), due: this.due() }),
    computation: ({ due }): string => (due === 'overdue' ? due : ''),
  });
  protected readonly bookingFilter = linkedSignal({ source: this.teamId, computation: () => '' });
  protected readonly openJobId = linkedSignal<string, string | null>({
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
    const people = new Map(data.people.map((p) => [p.id, p]));
    const scheduled = new Set(data.workflow.scheduledStatusIds);
    return data.jobs.map((job) => toCard(job, people, scheduled));
  });

  /** Each column with its matching cards: by status in the column's order, then by required date, undated last. */
  protected readonly columns = computed(() => {
    const visible = this.cards().filter((card) => this.matches(card));
    return (this.data()?.workflow.columns ?? []).map((column) => {
      const order = new Map(column.statuses.map((s, i) => [s.id, i]));
      return {
        column,
        done: column.statuses.every((s) => s.kind !== 'Open'),
        cards: visible
          .filter((card) => order.has(card.job.statusId))
          .sort(
            (a, b) =>
              order.get(a.job.statusId)! - order.get(b.job.statusId)! ||
              (a.job.deadline ?? '9999').localeCompare(b.job.deadline ?? '9999'),
          ),
      };
    });
  });

  /**
   * Ids of the collapsed columns: the viewer's own, plus as many more as it takes for the columns to fit, done columns
   * first. After a click, the columns stay as the viewer left them until the next resize or page load.
   */
  protected readonly collapsed = computed(
    () =>
      this.heldByClick() ??
      collapsedColumns(
        this.columns().map((c) => ({ id: c.column.id, done: c.done })),
        this.manuallyCollapsed(),
        this.areaWidth(),
        this.emptyWhileFiltered(),
      ),
  );

  /** Columns a filter leaves empty; they collapse first so the matching cards stay in view. */
  private readonly emptyWhileFiltered = computed(
    () =>
      new Set(
        this.filtered()
          ? this.columns()
              .filter((c) => c.cards.length === 0)
              .map((c) => c.column.id)
          : [],
      ),
  );

  /** The brands of the cards shown, for the colour key (D61). */
  protected readonly brands = computed(() =>
    legendBrands(
      this.columns().flatMap((c) => c.cards),
      (card) => ({ name: card.job.department, colour: card.job.colour }),
    ),
  );

  protected readonly filtered = computed(
    () =>
      !!(
        this.designerFilter() ||
        this.departmentFilter() ||
        this.dueFilter() ||
        this.bookingFilter()
      ),
  );

  /** The workflow form the open job's drawer starts on, when a card was dropped on a column that calls for one. */
  protected readonly openAction = linkedSignal<string | null, WorkflowAction | null>({
    source: () => this.openJobId(),
    computation: () => null,
  });

  /** The job being dragged, so the columns can show where it may go. */
  protected readonly dragging = signal<Job | null>(null);

  /** The actions that open a menu, and where, when a card is dropped on a column that several of them lead to. */
  protected readonly dropMenu = signal<{
    job: Job;
    actions: WorkflowAction[];
    point: { x: number; y: number };
  } | null>(null);

  /** While a card is dragged, what dropping it on each column does (the action names), and which columns dim. */
  protected readonly dragTargets = computed(() => {
    const job = this.dragging();
    const data = this.data();
    if (!job || !data) return null;
    const labels = actionLabels(this.auth.terms());
    return new Map(
      data.workflow.columns.map((column) => {
        const actions = actionsLeadingTo(job, column, data.workflow);
        const own = data.workflow.columns.find((c) => c.statuses.some((s) => s.id === job.statusId));
        return [
          column.id,
          {
            hint: actions.map((a) => labels[a]).join(' or ') || null,
            dimmed: actions.length === 0 && column.id !== own?.id,
          },
        ] as const;
      }),
    );
  });

  protected readonly openCard = computed(
    () => this.cards().find((card) => card.job.id === this.openJobId()) ?? null,
  );

  /**
   * A card was dragged and let go: the column under the pointer decides the action (D74). One that needs only a click
   * runs at once; one that needs more opens the job on its form; anything else is refused with a hint.
   */
  protected async dropped(event: { job: Job; point: { x: number; y: number } }): Promise<void> {
    const data = this.data();
    const columnId = document
      .elementFromPoint(event.point.x, event.point.y)
      ?.closest('[data-column-id]')
      ?.getAttribute('data-column-id');
    const target = data?.workflow.columns.find((c) => c.id === columnId);
    if (!data || !target) return;
    this.dragging.set(null);
    const outcome = dropOutcome(event.job, target, data.workflow, this.auth.terms());
    if (outcome?.kind === 'refuse') {
      this.toast.show(outcome.hint, 'warning');
    } else if (outcome?.kind === 'run') {
      if (await this.runner.runOneClick(event.job.id, outcome.action)) this.board.reload();
    } else if (outcome?.kind === 'choose') {
      this.dropMenu.set({ job: event.job, actions: outcome.actions, point: event.point });
    } else if (outcome) {
      this.openJobId.set(event.job.id);
      this.openAction.set(outcome.action);
    }
  }

  /** An action chosen from the drop menu runs or opens its form, as a drop that leads to only that action does. */
  protected async chooseDropAction(action: WorkflowAction): Promise<void> {
    const menu = this.dropMenu();
    this.dropMenu.set(null);
    if (!menu) return;
    if (ONE_CLICK_ACTIONS.includes(action)) {
      if (await this.runner.runOneClick(menu.job.id, action)) this.board.reload();
    } else {
      this.openJobId.set(menu.job.id);
      this.openAction.set(action);
    }
  }


  /** A manual collapse is remembered for this user; a manual expand holds only until the next resize. */
  protected toggleColumn(columnId: string): void {
    const next = toggleColumn(this.collapsed(), this.manuallyCollapsed(), columnId);
    this.heldByClick.set(next.collapsed);
    this.manuallyCollapsed.set(next.manual);
    this.prefs.saveCollapsedColumns(this.auth.me()!.id, next.manual);
  }

  private matches(card: BoardCard): boolean {
    return matchesFilters(card.job, {
      designerId: this.designerFilter(),
      departmentId: this.departmentFilter(),
      due: this.dueFilter(),
      booking: this.bookingFilter(),
    });
  }
}
