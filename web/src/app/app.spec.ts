import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('sends a signed-out visitor to the login page', async () => {
    const http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    TestBed.createComponent(App);

    const navigation = router.navigateByUrl('/');
    const unauthorized = { status: 401, statusText: 'Unauthorized' };
    (await vi.waitFor(() => http.expectOne('/api/auth/me'))).flush(null, unauthorized);
    http.expectOne('/api/teams').flush(null, unauthorized);
    await navigation;

    expect(router.url).toBe('/login');
  });
});
