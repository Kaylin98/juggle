import { NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';
import { Params, RouterLink } from '@angular/router';

export interface CardLink {
  label: string;
  link: string[];
  queryParams?: Params;
  /** Shown before the label on a team's line ("All teams"). */
  count?: number;
}

/**
 * A headline number. With one link the whole card opens it; with one per team ("All teams"),
 * each team is its own line, since the board and triage are per team.
 */
@Component({
  selector: 'app-summary-card',
  imports: [NgTemplateOutlet, RouterLink],
  template: `
    @if (links().length === 1) {
      <a
        [routerLink]="links()[0].link"
        [queryParams]="links()[0].queryParams"
        class="panel group flex h-full flex-col p-6 transition-shadow hover:shadow-lifted focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none"
      >
        <ng-container *ngTemplateOutlet="body" />
        <span class="mt-auto flex items-center gap-1 pt-4 text-sm font-semibold text-accent-600 group-hover:text-accent-700">
          {{ links()[0].label }}
          <ng-container *ngTemplateOutlet="arrow" />
        </span>
      </a>
    } @else {
      <div class="panel flex h-full flex-col p-6">
        <ng-container *ngTemplateOutlet="body" />
        <ul class="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-4">
          @for (item of links(); track item.label) {
            <li>
              <a
                [routerLink]="item.link"
                [queryParams]="item.queryParams"
                class="btn-quiet flex items-center gap-1"
              >
                {{ item.label }}
                <span class="text-ink-muted">{{ item.count }}</span>
                <ng-container *ngTemplateOutlet="arrow" />
              </a>
            </li>
          }
        </ul>
      </div>
    }

    <ng-template #body>
      <span class="label-caps">{{ label() }}</span>
      <span class="mt-3 font-display text-4xl font-semibold" [class]="count() > 0 ? toneText[tone()] : 'text-ink'">
        {{ count() }}
      </span>
      <p class="mt-2 text-sm text-ink-muted">{{ detail() }}</p>
    </ng-template>

    <ng-template #arrow>
      <!-- Heroicons arrow-right (mini, MIT) -->
      <svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fill-rule="evenodd"
          d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
          clip-rule="evenodd"
        />
      </svg>
    </ng-template>
  `,
})
export class SummaryCard {
  readonly label = input.required<string>();
  readonly count = input.required<number>();
  readonly detail = input.required<string>();
  /** The number's colour when above zero. */
  readonly tone = input.required<'over' | 'warn' | 'accent'>();
  readonly links = input.required<CardLink[]>();

  protected readonly toneText = { over: 'text-over-700', warn: 'text-warn-700', accent: 'text-accent-700' };
}
