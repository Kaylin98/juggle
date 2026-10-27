import { Component } from '@angular/core';

/**
 * The arrow for a styled select. Place it after the select inside a `relative` wrapper;
 * the select needs `appearance-none`, right padding (`pr-9`) to make room for it, and the
 * `peer` class so the arrow hides when the select is disabled.
 */
@Component({
  selector: 'app-select-chevron',
  host: {
    class: 'pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-slate-500 peer-disabled:hidden',
  },
  template: `
    <!-- Heroicons chevron-down (mini, MIT) -->
    <svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fill-rule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clip-rule="evenodd"
      />
    </svg>
  `,
})
export class SelectChevron {}
