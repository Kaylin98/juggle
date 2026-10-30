import { Component, computed, input } from '@angular/core';
import { RequestStatus } from '../../core/models';

const PILL: Record<RequestStatus, string> = {
  New: 'bg-accent-50 text-accent-700',
  Accepted: 'bg-ok-50 text-ok-700',
  Rejected: 'bg-over-50 text-over-700',
};

/** A request's status: New, Accepted or Rejected. */
@Component({
  selector: 'app-status-pill',
  host: { class: 'inline-block rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap', '[class]': 'pill()' },
  template: `{{ status() }}`,
})
export class StatusPill {
  readonly status = input.required<RequestStatus>();

  protected readonly pill = computed(() => PILL[this.status()]);
}
