import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { TeamRole } from './models';

describe('AuthService.landingUrl', () => {
  function landing(role: TeamRole | null, personId: string | null = 'p1'): string {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const auth = TestBed.inject(AuthService);
    auth.me.set({ id: 'u1', name: 'Jason', email: 'jason@example.com', avatarColour: '#5b8def', orgRole: 'User', personId });
    auth.teams.set(role ? [{ id: 'design', name: 'Design', colour: '#8a78d6', myRole: role }] : []);
    return auth.landingUrl();
  }

  it('sends admins to the dashboard', () => expect(landing('TeamAdmin')).toBe('/t/design/dashboard'));

  it('sends members to My work', () => expect(landing('Member')).toBe('/my-work'));

  it('sends members without a Person record to the board', () => expect(landing('Member', null)).toBe('/t/design/board'));

  it('sends requesters, who have no team, to their requests', () => expect(landing(null)).toBe('/requests'));
});
