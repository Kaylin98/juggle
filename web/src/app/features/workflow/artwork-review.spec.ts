import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { Approval, Artwork, Job, JobDetail } from '../../core/models';
import { job } from '../board/job.fixture';
import { ArtworkReview } from './artwork-review';

const file = (id: string, fileName: string) => ({ id, kind: 'Artwork' as const, fileName, sizeBytes: 1, uploadedByName: 'Priya Naidoo', uploadedAt: '2026-11-04T10:00:00Z' });
const version = (n: number, changes: Partial<Artwork>): Artwork => ({
  version: n, url: null, file: null, note: null, submittedByName: 'Priya Naidoo', submittedAt: '2026-11-04T10:00:00Z', ...changes,
});
const decision = (v: number, d: Approval['decision'], comment: string | null): Approval => ({
  stage: 'Design', decision: d, version: v, reviewerName: 'Naledi Khumalo', recordedAt: '2026-11-04T12:00:00Z', comment,
  stakeholderName: null, decidedOn: null, link: null,
});

async function render(artwork: Artwork[], approvals: Approval[] = [], changes: Partial<Job> = {}): Promise<HTMLElement> {
  const reviewed = job({
    id: 'j1', actions: ['ApproveDesign', 'SendBack'],
    deliverables: [{ type: 'WebsiteBanner', description: 'Takealot banners', specifications: '1200 x 628', dueDate: '2026-11-10' }],
    ...changes,
  });
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      {
        provide: JobsService,
        useValue: {
          get: () => Promise.resolve({ artwork, approvals } as unknown as JobDetail),
          changes: () => 0,
          notifyChanged: () => undefined,
          fileUrl: (j: string, f: string, inline = false) => `/api/jobs/${j}/files/${f}${inline ? '?inline=true' : ''}`,
        },
      },
      { provide: AuthService, useValue: { terms: signal({ department: 'Brand', brief: 'Brief', job: 'Job' }) } },
    ],
  });
  const fixture = TestBed.createComponent(ArtworkReview);
  fixture.componentRef.setInput('job', reviewed);
  await fixture.whenStable();
  return fixture.nativeElement;
}

describe('ArtworkReview', () => {
  it('shows the latest version with who submitted it, their note, the deliverables and the approve buttons', async () => {
    const element = await render([version(1, { file: file('f1', 'v1.png') }), version(2, { file: file('f2', 'v2.png'), note: 'Bigger logo' })]);

    expect(element.querySelector('h3')!.textContent).toContain('Version 2');
    expect(element.textContent).toContain('Priya Naidoo');
    expect(element.textContent).toContain('Bigger logo');
    expect(element.textContent).toContain('Takealot banners');
    expect(element.textContent).toContain('1200 x 628');
    expect([...element.querySelectorAll('button')].map((b) => b.textContent!.trim())).toEqual(['Approve design', 'Send back']);
  });

  it('previews an image that opens full size, and opens a PDF or a link in a tab', async () => {
    const image = await render([version(1, { file: file('f1', 'v1.PNG') })]);
    expect(image.querySelector('img')!.getAttribute('src')).toBe('/api/jobs/j1/files/f1?inline=true');
    expect(image.querySelector('a[target=_blank]')!.getAttribute('href')).toBe('/api/jobs/j1/files/f1?inline=true');

    const pdf = await render([version(1, { file: file('f1', 'proof.pdf') })]);
    expect(pdf.querySelector('img')).toBeNull();
    expect(pdf.querySelector('a[target=_blank]')!.getAttribute('href')).toBe('/api/jobs/j1/files/f1?inline=true');

    const link = await render([version(1, { url: 'https://example.com/a' })]);
    expect(link.querySelector('a[target=_blank]')!.textContent).toContain('Open the link');
  });

  it('offers other files as a download', async () => {
    const element = await render([version(1, { file: file('f1', 'layout.pptx') })]);

    const download = element.querySelector('a[download]')!;
    expect(download.getAttribute('href')).toBe('/api/jobs/j1/files/f1');
    expect(download.textContent).toContain('layout.pptx');
  });

  it('lists the earlier versions, each with the decision and comment it received', async () => {
    const element = await render(
      [version(1, { url: 'https://example.com/1' }), version(2, { url: 'https://example.com/2' })],
      [decision(1, 'ChangesRequested', 'Logo too small')],
    );

    const earlier = element.textContent!.slice(element.textContent!.indexOf('Earlier versions'));
    expect(earlier).toContain('Version 1');
    expect(earlier).toContain('Sent back');
    expect(earlier).toContain('Naledi Khumalo');
    expect(earlier).toContain('Logo too small');
  });

  it('says there is no artwork yet when the user may see none', async () => {
    expect((await render([])).textContent).toContain('No artwork to review yet.');
  });
});
