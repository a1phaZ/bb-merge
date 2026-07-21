import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-providers',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, EmptyStateComponent],
  template: `
    <div class="header">
      <h1 class="page-title mat-headline-4">Providers</h1>
      <button mat-raised-button color="primary" disabled>Add Provider</button>
    </div>
    <app-empty-state icon="cloud" title="No providers configured"
      description="Add a Git provider (Bitbucket, GitLab, or GitHub) to get started." />
  `,
  styles: `.header { display: flex; justify-content: space-between; align-items: center; }`,
})
export class ProvidersComponent {}
