import { Routes } from '@angular/router';
import { authGuard, landingGuard, teamAdminGuard, teamMemberGuard } from './core/guards';
import { LoginPage } from './features/login/login-page';
import { PlaceholderPage } from './features/placeholder-page';
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
        path: 'request',
        loadComponent: () => import('./features/requests/request-form').then((m) => m.RequestFormPage),
        title: 'New request',
      },
      {
        path: 'requests/:id',
        loadComponent: () => import('./features/requests/request-confirmation').then((m) => m.RequestConfirmationPage),
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
          { path: 'dashboard', component: PlaceholderPage, title: 'Dashboard', canActivate: [teamAdminGuard] },
          { path: '', pathMatch: 'full', redirectTo: 'board' },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
