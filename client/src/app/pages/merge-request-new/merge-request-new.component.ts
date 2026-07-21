import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-merge-request-new',
  standalone: true,
  imports: [MatCardModule, EmptyStateComponent],
  template: `
    <h1 class="page-title mat-headline-4">New Merge Request</h1>
    <app-empty-state icon="merge" title="Create Merge Requests"
      description="Configure and execute merge requests across multiple branches with real-time progress tracking." />
  `,
})
export class MergeRequestNewComponent {}
