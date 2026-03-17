import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'planner',
        loadComponent: () =>
          import('./planner/planner.page').then((m) => m.PlannerPage),
      },
      {
        path: 'groups',
        loadComponent: () =>
          import('./groups/groups.page').then((m) => m.GroupsPage),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./notes/notes.page').then((m) => m.SearchPage),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: 'focus',
        loadComponent: () =>
          import('./focus/focus.page').then((m) => m.FocusPage),
      },
    ],
  },  {
    path: 'notifications',
    loadComponent: () => import('./notifications/notifications.page').then( m => m.NotificationsPage)
  },

];