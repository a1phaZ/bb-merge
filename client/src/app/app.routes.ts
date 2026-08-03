import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { planGuard } from './core/guards/plan.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  { path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    title: 'Login' },

  { path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
    title: 'Create Account' },

  { path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Dashboard', canActivate: [authGuard] },

  { path: 'providers',
    loadComponent: () => import('./pages/providers/providers.component').then(m => m.ProvidersComponent),
    title: 'Providers', canActivate: [authGuard] },

  { path: 'merge-request/new',
    loadComponent: () => import('./pages/merge-request-new/merge-request-new.component').then(m => m.MergeRequestNewComponent),
    title: 'New Merge Request', canActivate: [authGuard] },

  { path: 'history',
    loadComponent: () => import('./pages/history/history.component').then(m => m.HistoryComponent),
    title: 'History', canActivate: [authGuard] },

  { path: 'templates',
    loadComponent: () => import('./pages/templates/templates.component').then(m => m.TemplatesComponent),
    title: 'Templates', canActivate: [authGuard, planGuard('templates')] },

  { path: 'browser',
    loadComponent: () => import('./pages/browser/browser.component').then(m => m.BrowserComponent),
    title: 'Browse Branches', canActivate: [authGuard] },

  { path: 'webhooks',
    loadComponent: () => import('./pages/webhooks/webhooks.component').then(m => m.WebhooksComponent),
    title: 'Webhooks', canActivate: [authGuard, planGuard('webhooks')] },

  { path: 'settings',
    loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
    title: 'Settings', canActivate: [authGuard] },

  { path: 'account',
    loadComponent: () => import('./pages/account/account.component').then(m => m.AccountComponent),
    title: 'Account', canActivate: [authGuard] },

  { path: 'pricing',
    loadComponent: () => import('./pages/pricing/pricing.component').then(m => m.PricingComponent),
    title: 'Plans', canActivate: [authGuard] },

  { path: 'logs',
    loadComponent: () => import('./pages/logs/logs.component').then(m => m.LogsComponent),
    title: 'Logs', canActivate: [authGuard] },

  { path: 'admin/users',
    loadComponent: () => import('./pages/admin/users/users.component').then(m => m.UsersComponent),
    title: 'User Management', canActivate: [authGuard] },

  { path: 'scheduler',
    loadComponent: () => import('./pages/scheduler/scheduler.component').then(m => m.SchedulerComponent),
    title: 'Scheduler', canActivate: [authGuard] },

  { path: '**', redirectTo: '/login' },
];
