import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Capability } from './models';

describe('AuthService', () => {
  function signedIn(capabilities: Capability[], personId: string | null, inTeam = true): AuthService {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const auth = TestBed.inject(AuthService);
    auth.me.set({
      id: 'u1',
      name: 'Priya',
      email: 'priya@example.com',
      avatarColour: '#5b8def',
      role: 'Any role name',
      capabilities,
      personId,
      terms: { department: 'Brand', brief: 'Brief', job: 'Job' },
      managedDepartmentIds: [],
    });
    auth.teams.set(inTeam ? [{ id: 'studio', name: 'Design Studio', colour: '#8a78d6' }] : []);
    return auth;
  }

  it('sends users who see all the work to the dashboard', () =>
    expect(signedIn(['ViewAllJobs', 'ViewBoard'], null).landingUrl()).toBe('/t/studio/dashboard'));

  it('sends people on a schedule to My work', () =>
    expect(signedIn(['ViewBoard', 'WorkOnJobs'], 'p1').landingUrl()).toBe('/my-work'));

  it('sends other board users to the board', () => expect(signedIn(['ViewBoard'], null).landingUrl()).toBe('/t/studio/board'));

  it('sends someone in no team, such as a marketing manager, to their requests', () =>
    expect(signedIn(['SubmitBrief'], null, false).landingUrl()).toBe('/requests'));

  it('answers from the capabilities and takes the terms from the organisation', () => {
    const auth = signedIn(['SubmitBrief'], null, false);
    expect([auth.can('SubmitBrief'), auth.can('Allocate')]).toEqual([true, false]);
    expect([auth.departmentLabel(), auth.terms().brief]).toEqual(['Brand', 'Brief']);
  });
});
