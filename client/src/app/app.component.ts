import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatDividerModule, MatTooltipModule,
  ],
  template: `
    <mat-toolbar color="primary">
      <button mat-icon-button (click)="drawerOpen.set(!drawerOpen())">
        <mat-icon>menu</mat-icon>
      </button>
      <span>Merge Request Creator</span>
      <span class="spacer"></span>
      <button mat-icon-button routerLink="/settings" matTooltip="Settings">
        <mat-icon>settings</mat-icon>
      </button>
    </mat-toolbar>

    <mat-drawer-container>
      <mat-drawer [opened]="drawerOpen()" mode="side" disableClose>
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active-link"
             (click)="drawerOpen.set(false)">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>
          <a mat-list-item routerLink="/providers" routerLinkActive="active-link"
             (click)="drawerOpen.set(false)">
            <mat-icon matListItemIcon>cloud</mat-icon>
            <span matListItemTitle>Providers</span>
          </a>
          <a mat-list-item routerLink="/merge-request/new" routerLinkActive="active-link"
             (click)="drawerOpen.set(false)">
            <mat-icon matListItemIcon>merge</mat-icon>
            <span matListItemTitle>New Merge Request</span>
          </a>
          <a mat-list-item routerLink="/history" routerLinkActive="active-link"
             (click)="drawerOpen.set(false)">
            <mat-icon matListItemIcon>history</mat-icon>
            <span matListItemTitle>History</span>
          </a>
          <a mat-list-item routerLink="/templates" routerLinkActive="active-link"
             (click)="drawerOpen.set(false)">
            <mat-icon matListItemIcon>description</mat-icon>
            <span matListItemTitle>Templates</span>
          </a>
          <a mat-list-item routerLink="/browser" routerLinkActive="active-link"
             (click)="drawerOpen.set(false)">
            <mat-icon matListItemIcon>account_tree</mat-icon>
            <span matListItemTitle>Browse Branches</span>
          </a>
          <a mat-list-item routerLink="/webhooks" routerLinkActive="active-link"
             (click)="drawerOpen.set(false)">
            <mat-icon matListItemIcon>webhook</mat-icon>
            <span matListItemTitle>Webhooks</span>
          </a>
          <a mat-list-item routerLink="/logs" routerLinkActive="active-link"
             (click)="drawerOpen.set(false)">
            <mat-icon matListItemIcon>terminal</mat-icon>
            <span matListItemTitle>Logs</span>
          </a>
          <mat-divider></mat-divider>
          <a mat-list-item routerLink="/scheduler" routerLinkActive="active-link"
             (click)="drawerOpen.set(false)">
            <mat-icon matListItemIcon>schedule</mat-icon>
            <span matListItemTitle>Scheduler</span>
          </a>
          <a mat-list-item routerLink="/admin/users" routerLinkActive="active-link"
             (click)="drawerOpen.set(false)">
            <mat-icon matListItemIcon>people</mat-icon>
            <span matListItemTitle>Users</span>
          </a>
          <a mat-list-item routerLink="/settings" routerLinkActive="active-link"
             (click)="drawerOpen.set(false)">
            <mat-icon matListItemIcon>settings</mat-icon>
            <span matListItemTitle>Settings</span>
          </a>
        </mat-nav-list>
      </mat-drawer>

      <mat-drawer-content>
        <div class="content-container">
          <router-outlet />
        </div>
      </mat-drawer-content>
    </mat-drawer-container>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100vh; }
    mat-toolbar { position: sticky; top: 0; z-index: 100; }
    mat-drawer-container { flex: 1; }
    mat-drawer { width: 260px; }
    mat-drawer-content { min-height: calc(100vh - 64px); }
    .active-link { background: rgba(63, 81, 181, 0.12); }
    .active-link .mat-icon { color: #3f51b5; }
  `,
})
export class AppComponent {
  drawerOpen = signal(true);

  constructor() {
    inject(MatIconRegistry).setDefaultFontSetClass('material-icons-outlined');
  }
}
