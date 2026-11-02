import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { JobsService } from '../../core/jobs.service';
import { WorkflowAction } from '../../core/models';
import { ToastService } from '../../shared/toast.service';

/** Runs the actions that need no more than a click (see ONE_CLICK_ACTIONS), tells the user, and says whether it worked. */
@Injectable({ providedIn: 'root' })
export class ActionRunner {
  private readonly auth = inject(AuthService);
  private readonly jobs = inject(JobsService);
  private readonly toast = inject(ToastService);

  async runOneClick(jobId: string, action: WorkflowAction): Promise<boolean> {
    const { brief, job } = this.auth.terms();
    try {
      switch (action) {
        case 'MarkReady':
          await this.jobs.markReady(jobId);
          this.toast.show(`${brief} checked. It is ready to allocate.`, 'success');
          break;
        case 'Start':
          await this.jobs.start(jobId);
          this.toast.show('Work started.', 'success');
          break;
        case 'Close':
          await this.jobs.close(jobId);
          this.toast.show(`${job} closed.`, 'success');
          break;
        default:
          throw new Error(`${action} needs a form.`);
      }
      return true;
    } catch (error) {
      this.toast.error(error);
      return false;
    }
  }
}
