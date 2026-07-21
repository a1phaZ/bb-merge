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
import { ApiService } from '../../core/services/api.service';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTabsModule, MatListModule, MatSnackBarModule,
  ],
  template: `
    <h1 class="page-title mat-headline-4">Settings</h1>

    <nav mat-tab-nav-bar [tabPanel]="tabPanel">
      <a mat-tab-link [active]="tab() === 'app'" (click)="tab.set('app')">Application</a>
      <a mat-tab-link [active]="tab() === 'storage'" (click)="tab.set('storage')">Storage</a>
      <a mat-tab-link [active]="tab() === 'notifications'" (click)="tab.set('notifications')" disabled>Notifications</a>
    </nav>
    <mat-tab-nav-panel #tabPanel>
      <div *ngIf="tab() === 'app'" class="tab-content">
        <mat-card>
          <mat-card-header><mat-card-title>Application Settings</mat-card-title></mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item>
                <span matListItemTitle>Storage Type</span>
                <span matListItemLine>{{ storageType() }}</span>
              </mat-list-item>
              <mat-list-item>
                <span matListItemTitle>Environment</span>
                <span matListItemLine>{{ env() }}</span>
              </mat-list-item>
            </mat-list>

            <h3 class="mt-16 mb-16">Custom Settings</h3>
            <div class="form-grid">
              <mat-form-field appearance="fill" *ngFor="let key of settingKeys()">
                <mat-label>{{ key }}</mat-label>
                <input matInput [(ngModel)]="editableSettings[key]">
              </mat-form-field>
            </div>
            <p *ngIf="settingKeys().length === 0" class="empty-note">No custom settings configured.</p>
            <button mat-raised-button color="primary" (click)="saveSettings()" *ngIf="settingKeys().length > 0">
              <mat-icon>save</mat-icon> Save Settings
            </button>
          </mat-card-content>
        </mat-card>
      </div>

      <div *ngIf="tab() === 'storage'" class="tab-content">
        <mat-card>
          <mat-card-header><mat-card-title>Storage</mat-card-title></mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item>
                <span matListItemTitle>Current Type</span>
                <span matListItemLine>
                  <span class="storage-badge">{{ storageType() }}</span>
                </span>
              </mat-list-item>
            </mat-list>
            <p class="mt-16">Storage type is configured via the <code>STORAGE_TYPE</code> environment variable.</p>
          </mat-card-content>
        </mat-card>
      </div>

      <div *ngIf="tab() === 'notifications'" class="tab-content">
        <mat-card>
          <mat-card-header><mat-card-title>Notifications</mat-card-title></mat-card-header>
          <mat-card-content>
            <p>Notification channels (Email, Telegram, Slack) will be available in v2.0.</p>
          </mat-card-content>
        </mat-card>
      </div>
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
