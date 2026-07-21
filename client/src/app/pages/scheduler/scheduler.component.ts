import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-scheduler',
  standalone: true,
  imports: [MatCardModule, EmptyStateComponent],
  template: `
    <h1 class="page-title mat-headline-4">Scheduler</h1>
    <app-empty-state icon="schedule" title="Scheduled Tasks"
      description="Schedule automated merge requests and maintenance tasks. Available in v2.0." />
  `,
})
export class SchedulerComponent {}
