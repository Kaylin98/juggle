import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MyWork } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class MyWorkService {
  private readonly http = inject(HttpClient);

  get(): Promise<MyWork> {
    return firstValueFrom(this.http.get<MyWork>('/api/my-work'));
  }
}
