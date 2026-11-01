import { Component } from '@angular/core';

/** Beside the brief form: what happens after sending, and what makes a brief easy to review. */
@Component({
  selector: 'app-request-guide',
  template: `
    <section class="panel p-6" aria-labelledby="guide-next">
      <h2 id="guide-next" class="font-display text-base font-semibold">What happens next</h2>
      <ol class="mt-4 space-y-4 text-sm">
        @for (step of steps; track step; let i = $index) {
          <li class="flex gap-3">
            <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-50 text-xs font-semibold text-accent-700">
              {{ i + 1 }}
            </span>
            <span class="pt-0.5 text-ink-muted">{{ step }}</span>
          </li>
        }
      </ol>
    </section>

    <section class="panel mt-6 p-6" aria-labelledby="guide-tips">
      <h2 id="guide-tips" class="font-display text-base font-semibold">Tips for a good brief</h2>
      <ul class="mt-4 space-y-2 text-sm text-ink-muted">
        @for (tip of tips; track tip) {
          <li class="flex gap-3">
            <span class="mt-2 size-1.5 shrink-0 rounded-full bg-accent-500" aria-hidden="true"></span>
            <span>{{ tip }}</span>
          </li>
        }
      </ul>
    </section>
  `,
})
export class RequestGuide {
  protected readonly steps = [
    'It gets its job ID straight away, and the studio reviews it. They may ask you for more information.',
    'It is scheduled with a designer, a planned start and an expected completion date.',
    'Track it in My requests, and review the artwork once the studio has approved it.',
  ];

  protected readonly tips = [
    'A clear purpose: what the artwork is for and what a good result looks like.',
    'Each deliverable on its own row, with its sizes, format and deadline, such as "A4 insert: Kloppers".',
    'Links to references, examples and brand assets under Supporting material.',
    'A realistic completion date, with time for a round of feedback.',
  ];
}
