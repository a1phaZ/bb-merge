import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { SettingsService } from '../../core/services/settings.service';
import { UiSettingsService, Theme } from '../../core/services/ui-settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTabsModule, MatListModule, MatSnackBarModule,
    TranslatePipe,
  ],
  template: `
    <h1 class="page-title mat-headline-4">{{ 'settings.title' | translate }}</h1>

    <nav mat-tab-nav-bar [tabPanel]="tabPanel">
      <a mat-tab-link [active]="tab() === 'app'" (click)="tab.set('app')">{{ 'settings.application' | translate }}</a>
      <a mat-tab-link [active]="tab() === 'storage'" (click)="tab.set('storage')">{{ 'settings.storage' | translate }}</a>
      <a mat-tab-link [active]="tab() === 'notifications'" (click)="tab.set('notifications')" disabled>{{ 'settings.notifications' | translate }}</a>
    </nav>
    <mat-tab-nav-panel #tabPanel>
      @if (tab() === 'app') {
        <div class="tab-content">
        <mat-card>
          <mat-card-header><mat-card-title>{{ 'settings.appSettings' | translate }}</mat-card-title></mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item>
                <span matListItemTitle>{{ 'settings.storageType' | translate }}</span>
                <span matListItemLine>{{ storageType() }}</span>
              </mat-list-item>
              <mat-list-item>
                <span matListItemTitle>{{ 'settings.environment' | translate }}</span>
                <span matListItemLine>{{ env() }}</span>
              </mat-list-item>
            </mat-list>

            <h3 class="mt-16 mb-16">{{ 'settings.customSettings' | translate }}</h3>
            <div class="form-grid">
              <mat-form-field appearance="fill">
                <mat-label>{{ 'settings.language' | translate }}</mat-label>
                <mat-select [ngModel]="uiSettings.language()" (ngModelChange)="uiSettings.language.set($event)">
                  <mat-option value="en">{{ 'settings.english' | translate }}</mat-option>
                  <mat-option value="ru">{{ 'settings.russian' | translate }}</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>{{ 'settings.theme' | translate }}</mat-label>
                <mat-select [ngModel]="uiSettings.theme()" (ngModelChange)="uiSettings.theme.set($event)">
                  <mat-option value="light">{{ 'settings.light' | translate }}</mat-option>
                  <mat-option value="dark">{{ 'settings.dark' | translate }}</mat-option>
                  <mat-option value="auto">{{ 'settings.auto' | translate }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
            @if (settingKeys().length === 0) {
              <p class="empty-note">{{ 'settings.noCustom' | translate }}</p>
            }
            @if (settingKeys().length > 0) {
              <button mat-raised-button color="primary" (click)="saveSettings()">
                <mat-icon>save</mat-icon> {{ 'settings.save' | translate }}
              </button>
            }
          </mat-card-content>
        </mat-card>
        </div>
      }

      @if (tab() === 'storage') {
        <div class="tab-content">
        <mat-card>
          <mat-card-header><mat-card-title>{{ 'settings.storageSection' | translate }}</mat-card-title></mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item>
                <span matListItemTitle>{{ 'settings.currentType' | translate }}</span>
                <span matListItemLine>
                  <span class="storage-badge">{{ storageType() }}</span>
                </span>
              </mat-list-item>
            </mat-list>
            <p class="mt-16">{{ 'settings.storageHint' | translate }}</p>
          </mat-card-content>
        </mat-card>
        </div>
      }

      @if (tab() === 'notifications') {
        <div class="tab-content">
        <mat-card>
          <mat-card-header><mat-card-title>{{ 'settings.notifications' | translate }}</mat-card-title></mat-card-header>
          <mat-card-content>
            <p>{{ 'settings.notificationsHint' | translate }}</p>
          </mat-card-content>
        </mat-card>
        </div>
      }
    </mat-tab-nav-panel>
  `,
  styles: `
    .tab-content { margin-top: 24px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
    .storage-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; background: #e3f2fd; color: #1565c0; font-weight: 500; text-transform: uppercase; font-size: 12px; }
    .empty-note { color: rgba(0,0,0,0.4); padding: 16px 0; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
    .mt-16 { margin-top: 16px; }
    .mb-16 { margin-bottom: 16px; }
  `,
})
export class SettingsComponent {
  private api = inject(ApiService);
  private settingsService = inject(SettingsService);
  private snackBar = inject(MatSnackBar);
  uiSettings = inject(UiSettingsService);

  tab = signal('app');
  storageType = signal('file');
  env = signal('development');
  editableSettings: Record<string, string> = {};
  settingKeys = signal<string[]>([]);

  constructor() {
    this.api.getStorageType().subscribe({
      next: (res) => this.storageType.set(res.type),
    });

    this.api.getHealth().subscribe({
      next: (res) => this.env.set(res.environment || 'unknown'),
    });

    effect(() => {
      const val = this.settingsService.settings.value();
      if (val && Object.keys(val).length > 0 && this.settingKeys().length === 0) {
        this.editableSettings = { ...val };
        this.settingKeys.set(Object.keys(val));
      }
    });
  }

  saveSettings() {
    this.settingsService.save(this.editableSettings).subscribe({
      next: () => {
        this.settingsService.refresh();
        this.snackBar.open('Settings saved', 'Close', { duration: 2000 });
      },
    });
  }
}
