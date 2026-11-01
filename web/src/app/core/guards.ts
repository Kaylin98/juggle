import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

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
  return auth.roleIn(route.paramMap.get('teamId')!) !== null || router.parseUrl(auth.landingUrl());
};

export const teamAdminGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureLoaded();
  const teamId = route.parent!.paramMap.get('teamId')!;
  return auth.roleIn(teamId) === 'TeamAdmin' || router.parseUrl(`/t/${teamId}/board`);
};

/** My work is for people on a team's schedule; the brands' marketing managers have no Person record (D10, D58). */
export const personGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureLoaded();
  return auth.me()?.personId != null || router.parseUrl(auth.landingUrl());
};

/** Time off approvals are for Team Admins of any team, and Org Admins (D47). */
export const approverGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureLoaded();
  return auth.isApprover() || router.parseUrl(auth.landingUrl());
};
