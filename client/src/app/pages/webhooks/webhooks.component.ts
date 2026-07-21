import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-webhooks',
  standalone: true,
  imports: [MatCardModule, EmptyStateComponent],
  template: `
    <h1 class="page-title mat-headline-4">Webhooks</h1>
    <app-empty-state icon="webhook" title="No webhooks registered"
      description="Register webhooks to receive notifications about merge request events." />
  `,
})
export class WebhooksComponent {}
