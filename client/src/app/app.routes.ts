import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  { path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Dashboard' },

  { path: 'providers',
    loadComponent: () => import('./pages/providers/providers.component').then(m => m.ProvidersComponent),
    title: 'Providers' },

  { path: 'merge-request/new',
    loadComponent: () => import('./pages/merge-request-new/merge-request-new.component').then(m => m.MergeRequestNewComponent),
    title: 'New Merge Request' },

  { path: 'history',
    loadComponent: () => import('./pages/history/history.component').then(m => m.HistoryComponent),
    title: 'History' },

  { path: 'templates',
    loadComponent: () => import('./pages/templates/templates.component').then(m => m.TemplatesComponent),
    title: 'Templates' },

  { path: 'browser',
    loadComponent: () => import('./pages/browser/browser.component').then(m => m.BrowserComponent),
    title: 'Browse Branches' },

  { path: 'webhooks',
    loadComponent: () => import('./pages/webhooks/webhooks.component').then(m => m.WebhooksComponent),
    title: 'Webhooks' },

  { path: 'settings',
    loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
    title: 'Settings' },

  { path: 'logs',
    loadComponent: () => import('./pages/logs/logs.component').then(m => m.LogsComponent),
    title: 'Logs' },

  { path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    title: 'Login' },

  { path: 'admin/users',
    loadComponent: () => import('./pages/admin/users/users.component').then(m => m.UsersComponent),
    title: 'User Management' },

  { path: 'scheduler',
    loadComponent: () => import('./pages/scheduler/scheduler.component').then(m => m.SchedulerComponent),
    title: 'Scheduler' },

  { path: 'wizard',
    loadComponent: () => import('./pages/wizard/wizard.component').then(m => m.WizardComponent),
    title: 'Setup Wizard' },

  { path: '**', redirectTo: '/dashboard' },
];
