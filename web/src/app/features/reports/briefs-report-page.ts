import { Component, computed, inject, input, linkedSignal, resource } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { BriefsReport } from '../../core/models';
import { TeamContextService } from '../../core/team-context.service';
import { Select, SelectOption } from '../../shared/select';
import { BriefsReportService } from './briefs-report.service';
import { DesignerChart } from './designer-chart';
import { ReceivedChart } from './received-chart';
import { statusColours } from './status-colours';
import { StatusSplit } from './status-split';

/**
 * The briefs report (D56), for Team Admins and Org Admins, like the studio's Monday report: briefs done and in
 * progress, cards per designer, and briefs received per month. The brand filter applies to all three.
 */
@Component({
  selector: 'app-briefs-report-page',
  imports: [DesignerChart, ReceivedChart, Select, StatusSplit],
  template: `
    <div class="px-8 pt-2 pb-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="page-title">Briefs report</h1>
          <p class="mt-1 text-sm text-ink-muted">{{ teamName() }} team</p>
        </div>
        @if (data(); as data) {
          <label class="flex items-center gap-3">
            <span class="label-caps">{{ auth.departmentLabel() }}</span>
            <app-select variant="pill" [options]="brandOptions()" [(value)]="brandId" />
          </label>
        }
      </div>

      @if (report.error()) {
        <p class="empty-state mt-6 text-over-700">The report could not be loaded. Refresh the page to try again.</p>
      } @else if (data(); as data) {
        <app-status-split class="mt-6" [statuses]="data.byStatus" [colours]="colours()" [teamName]="teamName()" />
        <div class="mt-6 grid items-start gap-6 xl:grid-cols-2">
          <app-designer-chart
            [designers]="data.byDesigner"
            [statuses]="data.byStatus"
            [colours]="colours()"
            [teamName]="teamName()"
          />
          <app-received-chart [months]="data.receivedByMonth" [teamName]="teamName()" />
        </div>
      } @else {
        <p class="empty-state mt-6">Loading the report...</p>
      }
    </div>
  `,
})
export class BriefsReportPage {
  private readonly reportService = inject(BriefsReportService);
  private readonly teamContext = inject(TeamContextService);
  protected readonly auth = inject(AuthService);

  /** From the `/t/:teamId/briefs` route. */
  readonly teamId = input.required<string>();

  /** The brand (department) shown, or empty for every brand. Back to every brand in another team. */
  protected readonly brandId = linkedSignal({ source: this.teamId, computation: () => '' });

  protected readonly report = resource({
    params: () => ({ teamId: this.teamId(), brandId: this.brandId() }),
    loader: ({ params }) => this.reportService.get(params.teamId, params.brandId),
  });

  /** Keeps the last report on screen while the next brand's loads, so filtering does not flash. */
  protected readonly data = linkedSignal<BriefsReport | null, BriefsReport | null>({
    source: () => (this.report.hasValue() ? this.report.value() : null),
    computation: (value, previous) => value ?? previous?.value ?? null,
  });

  protected readonly teamName = computed(() => this.teamContext.team()?.name ?? '');

  protected readonly colours = computed(() => statusColours(this.data()?.byStatus ?? []));

  protected readonly brandOptions = computed<SelectOption[]>(() => [
    { value: '', label: `All ${this.auth.departmentLabel().toLowerCase()}s` },
    ...(this.data()?.brands ?? []).map((b) => ({ value: b.id, label: b.name })),
  ]);
}
