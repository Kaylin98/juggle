import { CdkListbox, CdkOption, ListboxValueChangeEvent } from '@angular/cdk/listbox';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { Component, ElementRef, Injector, afterNextRender, computed, inject, input, model, signal, viewChild } from '@angular/core';
import { Avatar } from '../../shared/avatar';
import { SELECT_POSITIONS } from '../../shared/select';
import { SelectChevron } from '../../shared/select-chevron';

/** Someone the schedule can show. */
export interface FilterPerson {
  id: string;
  name: string;
  avatarColour: string;
}

/**
 * Picks the people the schedule shows (D60): a pill like `<app-select>`'s that opens a panel with a search box,
 * "Select all" and "Clear" (for the people the search matches), and a checkbox per person, beside a
 * "Showing N of M" label. Built on CDK Overlay and a multiple-choice Listbox, so it works from the keyboard.
 */
@Component({
  selector: 'app-people-filter',
  imports: [Avatar, CdkConnectedOverlay, CdkListbox, CdkOption, CdkOverlayOrigin, SelectChevron],
  host: { class: 'flex items-center gap-3' },
  template: `
    <span class="label-caps" id="people-filter-label">People</span>
    <div class="relative">
      <button
        #trigger
        #origin="cdkOverlayOrigin"
        cdkOverlayOrigin
        type="button"
        class="pill-select"
        aria-haspopup="listbox"
        aria-labelledby="people-filter-label people-filter-value"
        [attr.aria-expanded]="open()"
        (click)="toggle()"
        (keydown.arrowdown)="$event.preventDefault(); openPanel()"
      >
        <span id="people-filter-value">{{ summary() }}</span>
      </button>
      <app-select-chevron />
    </div>
    <span class="text-sm whitespace-nowrap text-ink-muted" aria-live="polite">
      Showing {{ shownCount() }} of {{ people().length }}
    </span>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      (overlayOutsideClick)="onOutsideClick($event)"
      (overlayKeydown)="onOverlayKeydown($event)"
      (detach)="close(false)"
    >
      <div class="flex max-h-96 w-72 flex-col overflow-hidden rounded-control bg-surface text-sm text-ink shadow-raised">
        <div class="border-b border-line p-2">
          <input
            #searchBox
            type="search"
            class="form-input py-1.5"
            placeholder="Search people"
            aria-label="Search people"
            [value]="search()"
            (input)="search.set(searchBox.value)"
            (keydown.arrowdown)="$event.preventDefault(); listbox()?.focus()"
          />
        </div>
        <div class="flex items-center justify-between border-b border-line px-3 py-2">
          <button type="button" class="btn-quiet text-xs" (click)="setAll(true)">Select all</button>
          <button type="button" class="btn-quiet text-xs" (click)="setAll(false)">Clear</button>
        </div>
        <ul
          cdkListbox
          cdkListboxMultiple
          aria-label="People shown"
          class="scroll-quiet min-h-0 flex-1 overflow-y-auto py-1 focus:outline-none"
          [cdkListboxValue]="listboxValue()"
          (cdkListboxValueChange)="onListboxChange($event)"
        >
          @for (person of matches(); track person.id) {
            @let shown = !hiddenIds().has(person.id);
            <li
              [cdkOption]="person.id"
              [cdkOptionTypeaheadLabel]="person.name"
              class="flex cursor-pointer items-center gap-2 px-3 py-2 outline-none hover:bg-accent-50 [&.cdk-option-active]:bg-accent-50"
            >
              <span
                class="flex size-4 shrink-0 items-center justify-center rounded-bar border"
                [class]="shown ? 'border-accent-600 bg-accent-600 text-white' : 'border-line-strong bg-surface'"
              >
                @if (shown) {
                  <!-- Heroicons check (micro, MIT) -->
                  <svg class="size-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path
                      fill-rule="evenodd"
                      d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                      clip-rule="evenodd"
                    />
                  </svg>
                }
              </span>
              <app-avatar size="sm" [name]="person.name" [colour]="person.avatarColour" />
              <span class="truncate">{{ person.name }}</span>
            </li>
          } @empty {
            <li class="px-3 py-2 text-ink-muted">No matches</li>
          }
        </ul>
      </div>
    </ng-template>
  `,
})
export class PeopleFilter {
  private readonly injector = inject(Injector);

  readonly people = input.required<FilterPerson[]>();
  /** The ids of the people left off the schedule. */
  readonly hiddenIds = model.required<ReadonlySet<string>>();

  protected readonly open = signal(false);
  protected readonly search = signal('');
  protected readonly positions = SELECT_POSITIONS;

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  protected readonly listbox = viewChild(CdkListbox);
  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');

  protected readonly shownCount = computed(() => this.people().filter((p) => !this.hiddenIds().has(p.id)).length);

  protected readonly summary = computed(() => {
    const shown = this.shownCount();
    if (shown === this.people().length) return 'Everyone';
    return shown === 0 ? 'No one' : `${shown} selected`;
  });

  protected readonly matches = computed(() => {
    const term = this.search().trim().toLowerCase();
    return term ? this.people().filter((p) => p.name.toLowerCase().includes(term)) : this.people();
  });

  /** The listbox only accepts values it has an option for, so it gets the shown people among the matches. */
  protected readonly listboxValue = computed(() => this.matches().filter((p) => !this.hiddenIds().has(p.id)).map((p) => p.id));

  protected toggle(): void {
    if (this.open()) this.close();
    else this.openPanel();
  }

  protected openPanel(): void {
    this.search.set('');
    this.open.set(true);
    afterNextRender(() => this.searchBox()?.nativeElement.focus(), { injector: this.injector });
  }

  /** Closes the panel; returns focus to the trigger unless the viewer clicked elsewhere. */
  protected close(refocus = true): void {
    if (!this.open()) return;
    this.open.set(false);
    if (refocus) this.trigger().nativeElement.focus();
  }

  protected onOutsideClick(event: MouseEvent): void {
    if (!this.trigger().nativeElement.contains(event.target as Node)) this.close(false);
  }

  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    this.close();
  }

  /** The matches the listbox now has ticked are shown; the matches it does not are hidden; everyone else stays. */
  protected onListboxChange(event: ListboxValueChangeEvent<string>): void {
    const ticked = new Set(event.value);
    this.update((hidden, person) => (ticked.has(person.id) ? hidden.delete(person.id) : hidden.add(person.id)));
  }

  /** "Select all" shows, and "Clear" hides, every person the search matches. */
  protected setAll(shown: boolean): void {
    this.update((hidden, person) => (shown ? hidden.delete(person.id) : hidden.add(person.id)));
  }

  private update(apply: (hidden: Set<string>, person: FilterPerson) => void): void {
    const hidden = new Set(this.hiddenIds());
    this.matches().forEach((person) => apply(hidden, person));
    this.hiddenIds.set(hidden);
  }
}
