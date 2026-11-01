import { Routes } from '@angular/router';
import { authGuard, capabilityGuard, landingGuard, personGuard, teamMemberGuard } from './core/guards';
import { TEAM_PAGES } from './core/team-context.service';
import { LoginPage } from './features/login/login-page';
import { Shell } from './layout/shell';

export const routes: Routes = [
  { path: 'login', component: LoginPage, title: 'Sign in' },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', canActivate: [landingGuard], children: [] },
      {
        path: 'my-work',
        canActivate: [personGuard],
        loadComponent: () => import('./features/my-work/my-work-page').then((m) => m.MyWorkPage),
        title: 'My work',
      },
      {
        path: 'time-off',
        canActivate: [capabilityGuard('ApproveTimeOff')],
        loadComponent: () => import('./features/time-off/time-off-page').then((m) => m.TimeOffPage),
        title: 'Time off',
      },
      {
        path: 'request',
        canActivate: [capabilityGuard('SubmitBrief')],
        loadComponent: () => import('./features/requests/request-form').then((m) => m.RequestFormPage),
        title: 'New request',
      },
      {
        // The fallback landing page, so it has no guard; the API lists only the user's own requests.
        path: 'requests',
        loadComponent: () => import('./features/requests/my-requests').then((m) => m.MyRequestsPage),
        title: 'My requests',
      },
      {
        path: 'requests/:id',
        loadComponent: () => import('./features/requests/request-detail').then((m) => m.RequestDetailPage),
        title: 'Request',
      },
      {
        path: 't/:teamId',
        canActivate: [teamMemberGuard],
        children: [
          {
            path: 'capacity',
            canActivate: [capabilityGuard(...TEAM_PAGES['capacity'])],
            loadComponent: () => import('./features/capacity/capacity-page').then((m) => m.CapacityPage),
            title: 'Schedule',
          },
          {
            path: 'board',
            canActivate: [capabilityGuard(...TEAM_PAGES['board'])],
            loadComponent: () => import('./features/board/board-page').then((m) => m.BoardPage),
            title: 'Board',
          },
          {
            path: 'triage',
            loadComponent: () => import('./features/triage/triage-page').then((m) => m.TriagePage),
            title: 'Triage',
            canActivate: [capabilityGuard(...TEAM_PAGES['triage'])],
          },
          {
            path: 'dashboard',
            loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
            title: 'Dashboard',
            canActivate: [capabilityGuard(...TEAM_PAGES['dashboard'])],
          },
          {
            path: 'briefs',
            loadComponent: () => import('./features/reports/briefs-report-page').then((m) => m.BriefsReportPage),
            title: 'Briefs report',
            canActivate: [capabilityGuard(...TEAM_PAGES['briefs'])],
          },
          { path: '', pathMatch: 'full', redirectTo: 'board' },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
