import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [MatCardModule, EmptyStateComponent],
  template: `
    <h1 class="page-title mat-headline-4">User Management</h1>
    <app-empty-state icon="people" title="User Management"
      description="Manage users, roles, and permissions. Available in v2.0." />
  `,
})
export class UsersComponent {}
