import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-browser',
  standalone: true,
  imports: [MatCardModule, EmptyStateComponent],
  template: `
    <h1 class="page-title mat-headline-4">Browse Branches</h1>
    <app-empty-state icon="account_tree" title="Browse repositories"
      description="Explore branches across your repositories and create merge requests from the browser." />
  `,
})
export class BrowserComponent {}
