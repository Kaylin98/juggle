import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { JobsService, reloadOnJobChange } from './jobs.service';
import { TeamContextService } from './team-context.service';

describe('reloadOnJobChange', () => {
  it('reloads when a job changes, and not for the changes made before it was set up', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: AuthService, useValue: { can: () => false } },
        { provide: TeamContextService, useValue: { teamId: () => null } },
      ],
    });
    const jobs = TestBed.inject(JobsService);
    jobs.notifyChanged();
    const reload = vi.fn(() => true);

    TestBed.runInInjectionContext(() => reloadOnJobChange({ reload }, jobs));
    await Promise.resolve();
    TestBed.tick();
    expect(reload).not.toHaveBeenCalled();

    jobs.notifyChanged();
    TestBed.tick();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
