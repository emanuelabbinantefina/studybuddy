import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard'; // Se lo usi

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage),
  },
  {
    path: 'complete-profile',
    loadComponent: () => import('./pages/complete-profile/complete-profile.page').then(m => m.CompleteProfilePage)
  },
  
  // --- BLOCCO TABS ---
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: '',
        redirectTo: 'home', // Di default va alla home
        pathMatch: 'full',
      },
      {
        path: 'home',
        loadComponent: () => import('./tabs/home/home.page').then(m => m.HomePage),
      },
      {
        path: 'planner',
        loadComponent: () => import('./tabs/planner/planner.page').then(m => m.PlannerPage),
      },
      {
        path: 'groups',
        loadComponent: () => import('./tabs/groups/groups.page').then(m => m.GroupsPage),
      },
      {
        path: 'search',
        loadComponent: () => import('./tabs/search/search.page').then(m => m.SearchPage),
      },
      {
        path: 'profile',
        loadComponent: () => import('./tabs/profile/profile.page').then(m => m.ProfilePage),
      },
      // NOTA: Ho tolto la chat da qui!
    ]
  },

  // --- PAGINE ESTERNE AI TAB (Schermo intero) ---
  {
    path: 'chat/:id', // <--- MESSA QUI (Fuori dai children)
    loadComponent: () => import('./pages/chat/chat.page').then(m => m.ChatPage)
  },
];