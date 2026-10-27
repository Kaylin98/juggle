import { CdkListbox, CdkOption, ListboxValueChangeEvent } from '@angular/cdk/listbox';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  forwardRef,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Avatar } from './avatar';
import { SelectChevron } from './select-chevron';

/**
 * One choice. Set avatarColour to show an avatar (people) or colour to show a dot (projects, teams);
 * otherwise the label is plain text.
 */
export interface SelectOption {
  value: string;
  label: string;
  avatarColour?: string;
  colour?: string;
}

/** Above this many options the panel gets a search box. */
const SEARCH_THRESHOLD = 8;

// Open below the trigger with a 4px gap, or above it when there is no room below.
const POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

/**
 * A select with a styled panel, built on CDK Overlay and Listbox. Bind [(value)], or use it as a form
 * control ([formField] or other Angular forms) through ControlValueAccessor.
 */
@Component({
  selector: 'app-select',
  imports: [Avatar, CdkConnectedOverlay, CdkListbox, CdkOption, CdkOverlayOrigin, NgTemplateOutlet, SelectChevron],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Select), multi: true }],
  host: { class: 'relative block' },
  templateUrl: './select.html',
})
export class Select implements ControlValueAccessor {
  private readonly injector = inject(Injector);

  readonly options = input.required<SelectOption[]>();
  readonly value = model('');
  /** Pill for toolbars and filters; form for fields in a form. */
  readonly variant = input<'pill' | 'form'>('form');
  /** Id for the trigger, so a <label for> can point at it. */
  readonly triggerId = input<string>();

  protected readonly open = signal(false);
  protected readonly disabled = signal(false);
  protected readonly search = signal('');
  protected readonly positions = POSITIONS;

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly listbox = viewChild(CdkListbox);
  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');

  protected readonly selected = computed(() => this.options().find((o) => o.value === this.value()));
  protected readonly searchable = computed(() => this.options().length > SEARCH_THRESHOLD);
  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    return term ? this.options().filter((o) => o.label.toLowerCase().includes(term)) : this.options();
  });

  /** The listbox only accepts a value it has an option for, so leave it out while a search hides that option. */
  protected readonly listboxValue = computed(() =>
    this.filtered().some((o) => o.value === this.value()) ? [this.value()] : [],
  );

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected toggle(): void {
    if (this.open()) this.close();
    else this.openPanel();
  }

  protected openPanel(): void {
    if (this.disabled()) return;
    this.search.set('');
    this.open.set(true);
    // The panel renders on the next pass; then focus the search box or the selected option.
    afterNextRender(
      () => {
        const box = this.searchBox()?.nativeElement;
        if (box) box.focus();
        else this.listbox()?.focus();
      },
      { injector: this.injector },
    );
  }

  /** Closes the panel; returns focus to the trigger unless the viewer clicked elsewhere. */
  protected close(refocus = true): void {
    if (!this.open()) return;
    this.open.set(false);
    this.onTouched();
    if (refocus) this.trigger().nativeElement.focus();
  }

  protected onOutsideClick(event: MouseEvent): void {
    // The trigger's own click toggles the panel; do not close it here as well.
    if (!this.trigger().nativeElement.contains(event.target as Node)) this.close(false);
  }

  /**
   * Escape closes only this panel. The overlay hears keys on <body>, so stopping the event here keeps it from
   * reaching a drawer or dialog that listens on the document.
   */
  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    this.close();
  }

  protected onListboxChange(event: ListboxValueChangeEvent<string>): void {
    // A single-select listbox clears the value when the selected option is chosen again; keep it instead.
    this.choose(event.value[0] ?? event.option!.value);
  }

  /** Enter in the search box chooses the first match. */
  protected chooseFirstMatch(event: Event): void {
    event.preventDefault();
    const first = this.filtered()[0];
    if (first) this.choose(first.value);
  }

  protected focusList(event: Event): void {
    event.preventDefault();
    this.listbox()?.focus();
  }

  private choose(value: string): void {
    if (value !== this.value()) {
      this.value.set(value);
      this.onChange(value);
    }
    this.close();
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
    if (disabled) this.close(false);
  }
}
