import { Component, computed, input } from '@angular/core';

/** A brand and its palette hue. */
export interface LegendBrand {
  name: string;
  colour: string;
}

/** The unique brands among the given items, by name, from the name and colour each carries. */
export function legendBrands<T>(items: T[], brand: (item: T) => LegendBrand): LegendBrand[] {
  const brands = new Map(items.map((item) => brand(item)).map((b) => [b.name, b]));
  return [...brands.values()].sort((a, b) => a.name.localeCompare(b.name));
}

let nextId = 0;

/**
 * A small key to the brand colours that jobs and bookings take (D61): a dot and the name per brand shown.
 * The label is the org's word for a brand, in the plural, such as "Brands" (D48).
 */
@Component({
  selector: 'app-brand-legend',
  template: `
    @if (brands().length > 0) {
      <div class="flex items-baseline gap-4 text-xs text-ink-muted">
        <span class="label-caps shrink-0" [id]="labelId">{{ label() }}</span>
        <ul class="flex flex-wrap items-center gap-x-4 gap-y-1" [attr.aria-labelledby]="labelId">
          @for (brand of brands(); track brand.name) {
            <li class="flex items-center gap-1.5" [style.--hue]="brand.colour">
              <span class="hue-dot size-2 shrink-0 rounded-full"></span>
              {{ brand.name }}
            </li>
          }
        </ul>
      </div>
    }
  `,
})
export class BrandLegend {
  readonly brands = input.required<LegendBrand[]>();
  /** The org's department label, such as "Brand". */
  readonly departmentLabel = input('Brand');

  protected readonly labelId = `brand-legend-${nextId++}`;
  protected readonly label = computed(() => `${this.departmentLabel()}s`);
}
