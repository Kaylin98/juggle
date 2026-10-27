import { Component, computed, input } from '@angular/core';

/** A round avatar: the person's initials on a soft tint of their colour. */
@Component({
  selector: 'app-avatar',
  template: `
    <span
      class="hue-tint hue-ink inline-flex shrink-0 items-center justify-center rounded-full font-bold select-none"
      [class]="size() === 'sm' ? 'size-6 text-[10px]' : 'size-9 text-xs'"
      [style.--hue]="colour()"
      [attr.title]="name()"
      >{{ initials() }}</span
    >
  `,
})
export class Avatar {
  readonly name = input.required<string>();
  readonly colour = input.required<string>();
  readonly size = input<'sm' | 'md'>('md');

  protected readonly initials = computed(() =>
    this.name()
      .split(' ')
      .filter((part) => part.length > 0)
      .map((part) => part[0])
      .filter((_, i, all) => i === 0 || i === all.length - 1)
      .join('')
      .toUpperCase(),
  );
}
