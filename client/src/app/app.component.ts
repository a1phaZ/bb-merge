import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { UiSettingsService } from './core/services/ui-settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatDividerModule, MatTooltipModule,
    TranslatePipe,
  ],
  template: `
    <mat-toolbar color="primary">
      <button mat-icon-button (click)="drawerExpanded.set(!drawerExpanded())"
        matTooltip="{{ drawerExpanded() ? ('nav.collapse' | translate) : ('nav.expand' | translate) }}">
        <mat-icon>menu</mat-icon>
      </button>
      <span>Merge Request Creator</span>
      <span class="spacer"></span>
      <button mat-icon-button routerLink="/settings" matTooltip="{{ 'nav.settings' | translate }}">
        <mat-icon>settings</mat-icon>
      </button>
    </mat-toolbar>

    <mat-drawer-container>
      <mat-drawer [opened]="true" mode="side" disableClose
        [class.collapsed]="!drawerExpanded()">
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active-link"
            matTooltip="{{ !drawerExpanded() ? ('nav.dashboard' | translate) : '' }}">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            @if (drawerExpanded()) {
              <span matListItemTitle>{{ 'nav.dashboard' | translate }}</span>
            }
          </a>
          <a mat-list-item routerLink="/providers" routerLinkActive="active-link"
            matTooltip="{{ !drawerExpanded() ? ('nav.providers' | translate) : '' }}">
            <mat-icon matListItemIcon>cloud</mat-icon>
            @if (drawerExpanded()) {
              <span matListItemTitle>{{ 'nav.providers' | translate }}</span>
            }
          </a>
          <a mat-list-item routerLink="/merge-request/new" routerLinkActive="active-link"
            matTooltip="{{ !drawerExpanded() ? ('nav.newMr' | translate) : '' }}">
            <mat-icon matListItemIcon>merge</mat-icon>
            @if (drawerExpanded()) {
              <span matListItemTitle>{{ 'nav.newMr' | translate }}</span>
            }
          </a>
          <a mat-list-item routerLink="/history" routerLinkActive="active-link"
            matTooltip="{{ !drawerExpanded() ? ('nav.history' | translate) : '' }}">
            <mat-icon matListItemIcon>history</mat-icon>
            @if (drawerExpanded()) {
              <span matListItemTitle>{{ 'nav.history' | translate }}</span>
            }
          </a>
          <a mat-list-item routerLink="/templates" routerLinkActive="active-link"
            matTooltip="{{ !drawerExpanded() ? ('nav.templates' | translate) : '' }}">
            <mat-icon matListItemIcon>description</mat-icon>
            @if (drawerExpanded()) {
              <span matListItemTitle>{{ 'nav.templates' | translate }}</span>
            }
          </a>
          <a mat-list-item routerLink="/browser" routerLinkActive="active-link"
            matTooltip="{{ !drawerExpanded() ? ('nav.browser' | translate) : '' }}">
            <mat-icon matListItemIcon>account_tree</mat-icon>
            @if (drawerExpanded()) {
              <span matListItemTitle>{{ 'nav.browser' | translate }}</span>
            }
          </a>
          <a mat-list-item routerLink="/webhooks" routerLinkActive="active-link"
            matTooltip="{{ !drawerExpanded() ? ('nav.webhooks' | translate) : '' }}">
            <mat-icon matListItemIcon>webhook</mat-icon>
            @if (drawerExpanded()) {
              <span matListItemTitle>{{ 'nav.webhooks' | translate }}</span>
            }
          </a>
          <a mat-list-item routerLink="/logs" routerLinkActive="active-link"
            matTooltip="{{ !drawerExpanded() ? ('nav.logs' | translate) : '' }}">
            <mat-icon matListItemIcon>terminal</mat-icon>
            @if (drawerExpanded()) {
              <span matListItemTitle>{{ 'nav.logs' | translate }}</span>
            }
          </a>
          <mat-divider></mat-divider>
          <a mat-list-item routerLink="/scheduler" routerLinkActive="active-link"
            matTooltip="{{ !drawerExpanded() ? ('nav.scheduler' | translate) : '' }}">
            <mat-icon matListItemIcon>schedule</mat-icon>
            @if (drawerExpanded()) {
              <span matListItemTitle>{{ 'nav.scheduler' | translate }}</span>
            }
          </a>
          <a mat-list-item routerLink="/admin/users" routerLinkActive="active-link"
            matTooltip="{{ !drawerExpanded() ? ('nav.users' | translate) : '' }}">
            <mat-icon matListItemIcon>people</mat-icon>
            @if (drawerExpanded()) {
              <span matListItemTitle>{{ 'nav.users' | translate }}</span>
            }
          </a>
          <a mat-list-item routerLink="/settings" routerLinkActive="active-link"
            matTooltip="{{ !drawerExpanded() ? ('nav.settings' | translate) : '' }}">
            <mat-icon matListItemIcon>settings</mat-icon>
            @if (drawerExpanded()) {
              <span matListItemTitle>{{ 'nav.settings' | translate }}</span>
            }
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
    mat-drawer { width: 260px; transition: width 0.2s ease; overflow: hidden; }
    mat-drawer.collapsed { width: 72px; }
    mat-drawer.collapsed .mat-icon { margin: 0 auto; }
    mat-drawer-content { min-height: calc(100vh - 64px); }
    .active-link { background: rgba(63, 81, 181, 0.12); }
    .active-link .mat-icon { color: #3f51b5; }
  `,
})
export class AppComponent {
  drawerExpanded = signal(true);
  private uiSettings = inject(UiSettingsService);

  constructor() {
    inject(MatIconRegistry).setDefaultFontSetClass('material-icons-outlined');
  }
}
