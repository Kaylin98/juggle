import {
  ConnectedPosition,
  OverlayRef,
  createFlexibleConnectedPositionStrategy,
  createOverlayRef,
  createRepositionScrollStrategy,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, DestroyRef, Directive, ElementRef, Injector, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-tooltip-panel',
  host: {
    role: 'tooltip',
    class: 'block max-w-80 rounded-control bg-ink px-2 py-1 text-xs font-semibold text-white shadow-raised',
  },
  template: `{{ text() }}`,
})
class TooltipPanel {
  readonly text = input.required<string>();
}

// 8px from the element, flipping to the other side when there is no room.
const POSITIONS: Record<'top' | 'right', ConnectedPosition[]> = {
  top: [
    { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8 },
    { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 },
  ],
  right: [
    { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 8 },
    { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -8 },
  ],
};

/**
 * A short text shown beside an element on hover and keyboard focus, in an overlay so scroll areas and narrow
 * containers do not clip it. An empty text shows nothing. Hides on press or click (a drag must not carry it),
 * Escape and a page change.
 */
@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    '(focusin)': 'onFocus($event)',
    '(focusout)': 'hide()',
    '(pointerdown)': 'hide()',
    '(click)': 'hide()',
    '(keydown.escape)': 'hide()',
  },
})
export class Tooltip {
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly text = input('', { alias: 'appTooltip' });
  readonly placement = input<'top' | 'right'>('top', { alias: 'appTooltipPlacement' });

  private overlay: OverlayRef | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.hide());
    // A menu hands focus back to its trigger after a choice; once the page has changed, its tooltip is noise.
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.hide());
  }

  protected show(): void {
    if (!this.text() || this.overlay) return;
    this.overlay = createOverlayRef(this.injector, {
      positionStrategy: createFlexibleConnectedPositionStrategy(this.injector, this.host).withPositions(POSITIONS[this.placement()]),
      scrollStrategy: createRepositionScrollStrategy(this.injector),
      panelClass: 'pointer-events-none',
    });
    this.overlay.attach(new ComponentPortal(TooltipPanel)).setInput('text', this.text());
  }

  protected hide(): void {
    this.overlay?.dispose();
    this.overlay = null;
  }

  /** Keyboard focus only: a mouse click focuses too, and the tooltip would stay up after it. */
  protected onFocus(event: FocusEvent): void {
    if ((event.target as HTMLElement).matches(':focus-visible')) this.show();
  }
}
