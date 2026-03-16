import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then(
        (m) => m.ForgotPasswordPage
      ),
  },
  {
    path: 'complete-profile',
    loadComponent: () =>
      import('./pages/complete-profile/complete-profile.page').then(
        (m) => m.CompleteProfilePage
      ),
  },

  // --- BLOCCO TABS ---
  {
    path: 'tabs',
    loadComponent: () =>
      import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./tabs/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'planner',
        loadComponent: () =>
          import('./tabs/planner/planner.page').then((m) => m.PlannerPage),
      },
      {
        path: 'groups',
        loadComponent: () =>
          import('./tabs/groups/groups.page').then((m) => m.GroupsPage),
      },
      {
        path: 'notes',
        loadComponent: () =>
          import('./tabs/notes/notes.page').then((m) => m.NotesPage),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./tabs/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: 'focus',
        loadComponent: () =>
          import('./tabs/focus/focus.page').then((m) => m.FocusPage),
      },
    ],
  },

  // --- PAGINE ESTERNE AI TAB ---
  {
    path: 'groups/:id',
    loadComponent: () =>
      import('./tabs/groups/group-detail/group-detail.page').then(
        (m) => m.GroupDetailPage
      ),
  },
  {
    path: 'group-detail',
    loadComponent: () =>
      import('./tabs/groups/group-detail/group-detail.page').then(
        (m) => m.GroupDetailPage
      ),
  },
];