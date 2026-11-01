import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Capability } from './models';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await auth.ensureLoaded()) || router.parseUrl('/login');
};

/** Sends `/` to the signed-in user's landing page. */
export const landingGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureLoaded();
  return router.parseUrl(auth.landingUrl());
};

export const teamMemberGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureLoaded();
  return auth.inTeam(route.paramMap.get('teamId')!) || router.parseUrl(auth.landingUrl());
};

/** Opens the page only for roles with every capability given (D77); anyone else goes to their landing page. */
export function capabilityGuard(...capabilities: Capability[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.ensureLoaded();
    return capabilities.every((capability) => auth.can(capability)) || router.parseUrl(auth.landingUrl());
  };
}

/** My work is for people on a team's schedule; marketing managers have no Person record (D10, D70). */
export const personGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureLoaded();
  return auth.me()?.personId != null || router.parseUrl(auth.landingUrl());
};
