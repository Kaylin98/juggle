import { TestBed } from '@angular/core/testing';
import { BrandLegend, legendBrands } from './brand-legend';

describe('BrandLegend', () => {
  it('lists each brand once, by name', () => {
    const cards = [
      { brand: 'Pure Electric', colour: '#e07a5f' },
      { brand: 'DJI', colour: '#5b8def' },
      { brand: 'DJI', colour: '#5b8def' },
    ];
    expect(legendBrands(cards, (c) => ({ name: c.brand, colour: c.colour }))).toEqual([
      { name: 'DJI', colour: '#5b8def' },
      { name: 'Pure Electric', colour: '#e07a5f' },
    ]);
  });

  it("shows a dot in each brand's colour under the org's label, and nothing without brands", async () => {
    const fixture = TestBed.createComponent(BrandLegend);
    fixture.componentRef.setInput('brands', [{ name: 'DJI', colour: '#5b8def' }]);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent!.replace(/\s+/g, ' ').trim()).toBe('Brands DJI');
    expect(element.querySelector('li')!.style.getPropertyValue('--hue')).toBe('#5b8def');

    fixture.componentRef.setInput('brands', []);
    await fixture.whenStable();
    expect(element.textContent!.trim()).toBe('');
  });
});
