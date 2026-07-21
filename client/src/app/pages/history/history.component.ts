import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [MatCardModule, EmptyStateComponent],
  template: `
    <h1 class="page-title mat-headline-4">History</h1>
    <app-empty-state icon="history" title="No history yet"
      description="Completed merge requests will appear here with their results and details." />
  `,
})
export class HistoryComponent {}
