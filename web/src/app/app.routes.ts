import { Routes } from '@angular/router';
import { authGuard, landingGuard, personGuard, teamAdminGuard, teamMemberGuard } from './core/guards';
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
        path: 'request',
        loadComponent: () => import('./features/requests/request-form').then((m) => m.RequestFormPage),
        title: 'New request',
      },
      {
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
            loadComponent: () => import('./features/capacity/capacity-page').then((m) => m.CapacityPage),
            title: 'Schedule',
          },
          {
            path: 'board',
            loadComponent: () => import('./features/board/board-page').then((m) => m.BoardPage),
            title: 'Board',
          },
          {
            path: 'triage',
            loadComponent: () => import('./features/triage/triage-page').then((m) => m.TriagePage),
            title: 'Triage',
            canActivate: [teamAdminGuard],
          },
          {
            path: 'dashboard',
            loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
            title: 'Dashboard',
            canActivate: [teamAdminGuard],
          },
          { path: '', pathMatch: 'full', redirectTo: 'board' },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
