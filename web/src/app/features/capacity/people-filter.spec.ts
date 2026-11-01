import { TestBed } from '@angular/core/testing';
import { FilterPerson, PeopleFilter } from './people-filter';
import { SchedulePrefsService } from './schedule-prefs.service';

const people: FilterPerson[] = [
  { id: 'ethan', name: 'Ethan Pillay', avatarColour: '#5b8def' },
  { id: 'lerato', name: 'Lerato Mokoena', avatarColour: '#d16b8f' },
  { id: 'priya', name: 'Priya Naidoo', avatarColour: '#3fa7a0' },
];

async function render(hidden: string[] = []) {
  const fixture = TestBed.createComponent(PeopleFilter);
  fixture.componentRef.setInput('people', people);
  fixture.componentRef.setInput('hiddenIds', new Set(hidden));
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const open = async () => {
    element.querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();
  };
  const button = (name: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('.cdk-overlay-container button')].find((b) => b.textContent!.trim() === name)!;
  const options = () => [...document.querySelectorAll<HTMLElement>('[role=option]')];
  const ticked = () => options().filter((o) => o.getAttribute('aria-selected') === 'true').map((o) => o.textContent!.trim());
  const hiddenIds = () => [...fixture.componentInstance.hiddenIds()].sort();
  return { fixture, element, open, button, options, ticked, hiddenIds };
}

describe('PeopleFilter', () => {
  afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

  it('shows how many of the people are shown', async () => {
    const { element } = await render(['lerato']);
    expect(element.textContent).toContain('2 selected');
    expect(element.textContent).toContain('Showing 2 of 3');
  });

  it('ticks a checkbox per person shown, and a click hides or shows that person', async () => {
    const { fixture, open, options, ticked, hiddenIds } = await render(['lerato']);
    await open();
    expect(ticked()).toEqual([expect.stringContaining('Ethan Pillay'), expect.stringContaining('Priya Naidoo')]);

    options()[0].click();
    await fixture.whenStable();
    expect(hiddenIds()).toEqual(['ethan', 'lerato']);
    options()[1].click();
    await fixture.whenStable();
    expect(hiddenIds()).toEqual(['ethan']);
  });

  it('selects all and clears, only the people the search matches', async () => {
    const { fixture, element, open, button, hiddenIds } = await render();
    await open();
    button('Clear').click();
    await fixture.whenStable();
    expect(hiddenIds()).toEqual(['ethan', 'lerato', 'priya']);
    expect(element.textContent).toContain('No one');

    const search = document.querySelector<HTMLInputElement>('.cdk-overlay-container input')!;
    search.value = 'pri';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    button('Select all').click();
    await fixture.whenStable();
    expect(hiddenIds()).toEqual(['ethan', 'lerato']);
    expect(element.textContent).toContain('Showing 1 of 3');
  });
});

describe('SchedulePrefsService', () => {
  afterEach(() => localStorage.clear());

  it('remembers the hidden people per user', () => {
    const prefs = TestBed.inject(SchedulePrefsService);
    prefs.saveHiddenPeople('u1', new Set(['lerato']));
    expect([...prefs.hiddenPeople('u1')]).toEqual(['lerato']);
    expect(prefs.hiddenPeople('u2').size).toBe(0);
  });
});
