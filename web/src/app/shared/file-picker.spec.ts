import { TestBed } from '@angular/core/testing';
import { FilePicker, MAX_FILE_BYTES, formatSize } from './file-picker';

async function render(multiple = true) {
  const fixture = TestBed.createComponent(FilePicker);
  fixture.componentRef.setInput('multiple', multiple);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const pick = async (...files: File[]) => {
    const input = element.querySelector('input')!;
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };
  return { fixture, element, pick };
}

const file = (name: string, size = 10) => new File([new Uint8Array(size)], name);

describe('FilePicker', () => {
  it('lists the files chosen, adds to them, and removes one', async () => {
    const { fixture, element, pick } = await render();

    await pick(file('brief.pdf'));
    await pick(file('logo.png'));
    expect([...element.querySelectorAll('li span.truncate')].map((s) => s.textContent)).toEqual(['brief.pdf', 'logo.png']);
    [...element.querySelectorAll('li button')][0].dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(fixture.componentInstance.files().map((f) => f.name)).toEqual(['logo.png']);
  });

  it('keeps only the latest file when it takes one', async () => {
    const { fixture, pick } = await render(false);

    await pick(file('v1.png'));
    await pick(file('v2.png'));

    expect(fixture.componentInstance.files().map((f) => f.name)).toEqual(['v2.png']);
  });

  it('refuses a file over 25 MB or of an unsupported type, and says why', async () => {
    const { fixture, element, pick } = await render();

    await pick(file('big.mp4', MAX_FILE_BYTES + 1));
    expect(element.textContent).toContain('big.mp4 is over 25 MB.');
    await pick(file('setup.exe'));
    expect(element.textContent).toContain('setup.exe is not a document, image, PDF or video.');
    await pick(file('ok.mp4', MAX_FILE_BYTES));

    expect(fixture.componentInstance.files().map((f) => f.name)).toEqual(['ok.mp4']);
    expect(element.textContent).not.toContain('is over 25 MB');
  });
});

describe('formatSize', () => {
  it('reads in KB below a megabyte and MB above', () => {
    expect(formatSize(100)).toBe('1 KB');
    expect(formatSize(340 * 1024)).toBe('340 KB');
    expect(formatSize(12.5 * 1024 * 1024)).toBe('12.5 MB');
  });
});
