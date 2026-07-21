import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="empty-state">
      <mat-icon class="icon">{{ icon() }}</mat-icon>
      <h3>{{ title() }}</h3>
      <p>{{ description() }}</p>
      <ng-content />
    </div>
  `,
  styles: `
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px 24px; text-align: center; }
    .icon { font-size: 64px; height: 64px; width: 64px; margin-bottom: 16px; color: rgba(0,0,0,0.25); }
    h3 { margin: 0 0 8px; font-weight: 400; color: rgba(0,0,0,0.6); }
    p { margin: 0; color: rgba(0,0,0,0.4); max-width: 400px; }
  `,
})
export class EmptyStateComponent {
  icon = input('inbox');
  title = input('Nothing here');
  description = input('');
}
