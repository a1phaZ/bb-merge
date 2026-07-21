import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, EmptyStateComponent],
  template: `
    <h1 class="page-title mat-headline-4">Dashboard</h1>
    <app-empty-state icon="dashboard" title="Welcome to Merge Request Creator"
      description="Dashboard will display statistics, recent operations, and quick actions." />
  `,
})
export class DashboardComponent {}
