import { Routes } from '@angular/router';
import { authGuard, landingGuard, teamAdminGuard, teamMemberGuard } from './core/guards';
import { BoardPage } from './features/board/board-page';
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
      { path: 'request', component: PlaceholderPage, title: 'New request' },
      {
        path: 't/:teamId',
        canActivate: [teamMemberGuard],
        children: [
          { path: 'capacity', component: PlaceholderPage, title: 'Schedule' },
          { path: 'board', component: BoardPage, title: 'Board' },
          { path: 'triage', component: PlaceholderPage, title: 'Triage', canActivate: [teamAdminGuard] },
          { path: 'dashboard', component: PlaceholderPage, title: 'Dashboard', canActivate: [teamAdminGuard] },
          { path: '', pathMatch: 'full', redirectTo: 'board' },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
