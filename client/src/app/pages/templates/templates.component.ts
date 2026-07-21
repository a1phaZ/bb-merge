import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [MatCardModule, EmptyStateComponent],
  template: `
    <h1 class="page-title mat-headline-4">Templates</h1>
    <app-empty-state icon="description" title="No templates yet"
      description="Save frequently used merge request configurations as reusable templates." />
  `,
})
export class TemplatesComponent {}
