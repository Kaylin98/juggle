import { Component } from '@angular/core';

/** Beside the request form: what happens after sending, and what makes a request easy to triage. */
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
      <h2 id="guide-tips" class="font-display text-base font-semibold">Tips for a good request</h2>
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
    'The team reviews your request in triage.',
    'It is accepted with an assignee and a due date, or rejected with a reason.',
    'Track it in My requests.',
  ];

  protected readonly tips = [
    'A clear goal: what the work is for and what a good result looks like.',
    'The audience: who will see or use it.',
    'Links to references, examples or brand assets.',
    'A realistic needed-by date, with time for a round of changes.',
  ];
}
