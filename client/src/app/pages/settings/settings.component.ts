import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [MatCardModule, EmptyStateComponent],
  template: `
    <h1 class="page-title mat-headline-4">Settings</h1>
    <app-empty-state icon="settings" title="Application Settings"
      description="Configure application, storage, notifications, and system preferences." />
  `,
})
export class SettingsComponent {}
