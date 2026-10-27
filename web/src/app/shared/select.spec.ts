import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Select, SelectOption } from './select';

const people: SelectOption[] = [
  { value: '', label: 'Unassigned' },
  { value: 'p1', label: 'Priya Naidoo', avatarColour: '#5b8def' },
  { value: 'p2', label: 'Ethan Pillay', avatarColour: '#3fa7a0' },
];

@Component({
  imports: [Select, ReactiveFormsModule],
  template: `<app-select [options]="options" [formControl]="control" />`,
})
class Host {
  options = people;
  control = new FormControl('p1');
}

function setup(options = people) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.options = options;
  fixture.detectChanges();
  const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  const open = async () => {
    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const listOptions = () => [...document.querySelectorAll<HTMLElement>('[role=option]')];
  return { fixture, trigger, open, options: listOptions };
}

describe('Select', () => {
  afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

  it('shows the form value on the trigger', () => {
    const { trigger } = setup();
    expect(trigger.textContent).toContain('Priya Naidoo');
  });

  it('opens a panel and writes the chosen option back to the form', async () => {
    const { fixture, trigger, open, options } = setup();
    await open();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    options()[2].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe('p2');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.textContent).toContain('Ethan Pillay');
  });

  it('is disabled with its form control', () => {
    const { fixture, trigger } = setup();
    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect(trigger.disabled).toBe(true);
  });

  it('offers a search box above eight options and filters by label, even past the selected one', async () => {
    const many = [...people, ...Array.from({ length: 6 }, (_, i) => ({ value: `${i}`, label: `Person ${i}` }))];
    const { fixture, open, options } = setup(many);
    await open();

    const search = document.querySelector<HTMLInputElement>('input[type=search]')!;
    search.value = 'person 4';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(options().map((o) => o.textContent?.trim())).toEqual(['Person 4']);
  });
});
