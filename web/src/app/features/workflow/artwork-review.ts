import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, resource } from '@angular/core';
import { JobsService, reloadOnJobChange } from '../../core/jobs.service';
import { Approval, Artwork, Job, Person, WorkflowAction } from '../../core/models';
import { DELIVERABLE_LABELS } from '../requests/brief-fields';
import { JobActions } from './job-actions';

/** How a version of the artwork opens: an image shows as a preview, a PDF opens in a tab, anything else downloads. */
interface Opening {
  kind: 'image' | 'pdf' | 'file' | 'link';
  href: string;
  name: string;
}

const IMAGE = /\.(jpe?g|png|gif|webp|svg)$/i;

/**
 * What a reviewer needs to approve artwork (the head of design, then the marketing manager): the latest version, who
 * submitted it, when and their note, with Approve and Send back right under it, the deliverables to check it against,
 * and the earlier versions with the decision and comment each received. Shown wherever the approve buttons are.
 */
@Component({
  selector: 'app-artwork-review',
  imports: [DatePipe, JobActions],
  host: { class: 'block @container' },
  template: `
    <section class="rounded-card bg-surface-muted p-4" aria-label="Artwork to review">
      <div class="grid items-start gap-6 @2xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div class="min-w-0">
          @if (latest(); as version) {
            <h3 class="font-display text-sm font-semibold">
              Version {{ version.version }}
              <span class="font-sans font-normal text-ink-muted">
                &middot; {{ version.submittedByName }} &middot;
                {{ version.submittedAt | date: 'EEE d MMM, HH:mm' }}
              </span>
            </h3>
            @if (version.note) {
              <p class="mt-2 text-sm whitespace-pre-line">{{ version.note }}</p>
            }
            <div class="mt-3">
              @let opening = open(version);
              @switch (opening.kind) {
                @case ('image') {
                  <a [href]="opening.href" target="_blank" rel="noopener" class="inline-block rounded-control focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none">
                    <img
                      class="max-h-80 max-w-full rounded-control bg-surface shadow-soft"
                      [src]="opening.href"
                      [alt]="'Artwork version ' + version.version + ': ' + opening.name"
                    />
                    <span class="sr-only">Open full size</span>
                  </a>
                }
                @case ('pdf') {
                  <a class="btn-secondary inline-flex items-center" [href]="opening.href" target="_blank" rel="noopener">
                    Open {{ opening.name }}
                  </a>
                }
                @case ('file') {
                  <a class="btn-secondary inline-flex items-center" [href]="opening.href" [attr.download]="opening.name">
                    Download {{ opening.name }}
                  </a>
                }
                @default {
                  <a class="btn-secondary inline-flex items-center" [href]="opening.href" target="_blank" rel="noopener">
                    Open the link
                  </a>
                }
              }
            </div>
          } @else if (detail.isLoading()) {
            <p class="text-sm text-ink-muted">Loading the artwork...</p>
          } @else {
            <p class="text-sm text-ink-muted">No artwork to review yet.</p>
          }
          <app-job-actions
            class="mt-4 block empty:hidden"
            [job]="job()"
            [people]="people()"
            [startWith]="startWith()"
          />
        </div>

        <div>
          <h3 class="label-caps">Deliverables to check</h3>
          <ul class="mt-2 space-y-2 text-sm">
            @for (deliverable of job().deliverables; track $index) {
              <li>
                <span class="font-semibold">{{ deliverable.description }}</span>
                <span class="block text-ink-muted">
                  {{ deliverableLabels[deliverable.type] }}
                  @if (deliverable.specifications) {
                    &middot; {{ deliverable.specifications }}
                  }
                  @if (deliverable.dueDate) {
                    &middot; by {{ deliverable.dueDate | date: 'd MMM' }}
                  }
                </span>
              </li>
            } @empty {
              <li class="text-ink-muted">No deliverables listed.</li>
            }
          </ul>
        </div>
      </div>

      @if (earlier().length > 0) {
        <div class="mt-6 border-t border-line pt-4">
          <h3 class="label-caps">Earlier versions</h3>
          <ul class="mt-2 space-y-3 text-sm">
            @for (version of earlier(); track version.version) {
              <li>
                @let opening = open(version);
                <a
                  class="font-semibold text-accent-700 hover:underline"
                  [href]="opening.href"
                  [attr.target]="opening.kind === 'file' ? null : '_blank'"
                  [attr.download]="opening.kind === 'file' ? opening.name : null"
                  rel="noopener"
                  >Version {{ version.version }}</a
                >
                <span class="text-ink-muted">
                  &middot; {{ version.submittedByName }} &middot;
                  {{ version.submittedAt | date: 'EEE d MMM' }}
                </span>
                @for (decision of decisions(version); track $index) {
                  <p class="mt-1">
                    <span [class]="decision.decision === 'Approved' ? 'text-ok-700' : 'text-warn-700'">
                      {{ decision.decision === 'Approved' ? 'Approved' : 'Sent back' }}
                    </span>
                    by {{ decision.stakeholderName ?? decision.reviewerName }}
                    @if (decision.comment) {
                      : {{ decision.comment }}
                    }
                  </p>
                }
              </li>
            }
          </ul>
        </div>
      }
    </section>
  `,
})
export class ArtworkReview {
  private readonly jobs = inject(JobsService);

  readonly job = input.required<Job>();
  /** The team's people, for actions that book a designer. */
  readonly people = input<Person[]>([]);
  readonly startWith = input<WorkflowAction | null>(null);

  protected readonly deliverableLabels = DELIVERABLE_LABELS;

  /** The job's artwork and decisions: the versions this user may see, which is none for the marketing manager before the design is approved. */
  protected readonly detail = resource({
    params: () => this.job().id,
    loader: ({ params }) => this.jobs.get(params),
  });

  constructor() {
    reloadOnJobChange(this.detail);
  }

  private readonly versions = computed(() => (this.detail.hasValue() ? this.detail.value().artwork : []));

  protected readonly latest = computed(() => this.versions().at(-1) ?? null);

  /** Earlier versions, newest first. */
  protected readonly earlier = computed(() => this.versions().slice(0, -1).reverse());

  protected open(version: Artwork): Opening {
    const { file, url } = version;
    if (!file) return { kind: 'link', href: url!, name: url! };
    const id = this.job().id;
    if (IMAGE.test(file.fileName)) return { kind: 'image', href: this.jobs.fileUrl(id, file.id, true), name: file.fileName };
    if (/\.pdf$/i.test(file.fileName)) return { kind: 'pdf', href: this.jobs.fileUrl(id, file.id, true), name: file.fileName };
    return { kind: 'file', href: this.jobs.fileUrl(id, file.id), name: file.fileName };
  }

  /** The decisions the version received, oldest first. */
  protected decisions(version: Artwork): Approval[] {
    return this.detail.hasValue() ? this.detail.value().approvals.filter((a) => a.version === version.version) : [];
  }
}
