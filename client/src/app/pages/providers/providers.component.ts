import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProvidersService } from '../../core/services/providers.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ProviderCreate } from '../../shared/models/provider.model';

@Component({
  selector: 'app-providers',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatTooltipModule,
    EmptyStateComponent,
  ],
  template: `
    <div class="header">
      <h1 class="page-title mat-headline-4">Providers</h1>
      <button mat-raised-button color="primary" (click)="showForm.set(true)" *ngIf="!showForm()">
        <mat-icon>add</mat-icon> Add Provider
      </button>
    </div>

    <mat-card *ngIf="showForm()" class="form-card">
      <mat-card-content>
        <h3>{{ editingId() ? 'Edit Provider' : 'New Provider' }}</h3>
        <div class="form-grid">
          <mat-form-field appearance="fill">
            <mat-label>Name</mat-label>
            <input matInput [(ngModel)]="form.name" placeholder="My Bitbucket">
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>Type</mat-label>
            <mat-select [(ngModel)]="form.type">
              <mat-option value="bitbucket">Bitbucket</mat-option>
              <mat-option value="gitlab">GitLab</mat-option>
              <mat-option value="github">GitHub</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>API URL</mat-label>
            <input matInput [(ngModel)]="form.apiUrl" placeholder="https://bitbucket.example.com">
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>Token / Password</mat-label>
            <input matInput type="password" [(ngModel)]="form.token">
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>Default Target Branch</mat-label>
            <input matInput [(ngModel)]="form.defaultTarget" placeholder="main">
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>Default Title Prefix</mat-label>
            <input matInput [(ngModel)]="form.defaultTitlePrefix" placeholder="Merge">
          </mat-form-field>
        </div>
        <div class="form-actions">
          <button mat-button (click)="cancelForm()">Cancel</button>
          <button mat-raised-button color="primary" (click)="save()" [disabled]="saving()">
            {{ saving() ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </mat-card-content>
    </mat-card>

    <mat-card>
      <mat-card-content>
        <table mat-table [dataSource]="providers()" class="full-width" *ngIf="providers().length > 0">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let p">{{ p.name }}</td>
          </ng-container>
          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Type</th>
            <td mat-cell *matCellDef="let p">
              <span class="type-badge" [class.bitbucket]="p.type==='bitbucket'" [class.gitlab]="p.type==='gitlab'" [class.github]="p.type==='github'">{{ p.type }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="apiUrl">
            <th mat-header-cell *matHeaderCellDef>API URL</th>
            <td mat-cell *matCellDef="let p">{{ p.apiUrl }}</td>
          </ng-container>
          <ng-container matColumnDef="defaultTarget">
            <th mat-header-cell *matHeaderCellDef>Target</th>
            <td mat-cell *matCellDef="let p">{{ p.defaultTarget || 'main' }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let p" class="actions-cell">
              <button mat-icon-button (click)="testConnection(p)" matTooltip="Test Connection" [disabled]="testingId() === p.id">
                <mat-icon>{{ testingId() === p.id ? 'hourglass_top' : 'wifi' }}</mat-icon>
              </button>
              <button mat-icon-button (click)="edit(p)" matTooltip="Edit">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="deleteProvider(p)" matTooltip="Delete">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>

        <app-empty-state *ngIf="providers().length === 0" icon="cloud"
          title="No providers configured"
          description="Add a Git provider to start creating merge requests.">
          <button mat-raised-button color="primary" (click)="showForm.set(true)">Add Provider</button>
        </app-empty-state>

        <div *ngIf="testResult()" class="test-result" [class.success]="testResult()?.ok" [class.error]="!testResult()?.ok">
          <mat-icon>{{ testResult()?.ok ? 'check_circle' : 'error' }}</mat-icon>
          {{ testResult()?.message }}
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
    .form-card { margin-bottom: 20px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .actions-cell { white-space: nowrap; }
    .type-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; text-transform: uppercase; background: #e0e0e0; }
    .type-badge.bitbucket { background: #e3f2fd; color: #1565c0; }
    .type-badge.gitlab { background: #fff3e0; color: #e65100; }
    .type-badge.github { background: #e8f5e9; color: #2e7d32; }
    .test-result { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding: 12px; border-radius: 4px; }
    .test-result.success { background: #e8f5e9; color: #2e7d32; }
    .test-result.error { background: #ffebee; color: #c62828; }
  `,
})
export class ProvidersComponent {
  private service = inject(ProvidersService);
  private snackBar = inject(MatSnackBar);

  providers = computed(() => this.service.providers.value() ?? []);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  saving = signal(false);
  testingId = signal<string | null>(null);
  testResult = signal<{ ok: boolean; message: string } | null>(null);

  columns = ['name', 'type', 'apiUrl', 'defaultTarget', 'actions'];

  form: ProviderCreate = { name: '', type: 'bitbucket', apiUrl: '', token: '', defaultTarget: 'main', defaultTitlePrefix: 'Merge' };

  cancelForm() {
    this.showForm.set(false);
    this.editingId.set(null);
    this.resetForm();
  }

  private resetForm() {
    this.form = { name: '', type: 'bitbucket', apiUrl: '', token: '', defaultTarget: 'main', defaultTitlePrefix: 'Merge' };
  }

  save() {
    if (!this.form.name || !this.form.apiUrl || !this.form.token) {
      this.snackBar.open('Name, API URL, and Token are required', 'Close', { duration: 3000 });
      return;
    }
    this.saving.set(true);
    const op = this.editingId()
      ? this.service.update(this.editingId()!, this.form)
      : this.service.create(this.form);

    op.subscribe({
      next: () => {
        this.service.refresh();
        this.cancelForm();
        this.snackBar.open('Provider saved', 'Close', { duration: 2000 });
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  edit(p: any) {
    this.editingId.set(p.id);
    this.form = { ...p, token: '' };
    this.showForm.set(true);
  }

  deleteProvider(p: any) {
    if (!confirm(`Delete provider "${p.name}"?`)) return;
    this.service.delete(p.id).subscribe(() => {
      this.service.refresh();
      this.snackBar.open('Provider deleted', 'Close', { duration: 2000 });
    });
  }

  testConnection(p: any) {
    this.testingId.set(p.id);
    this.testResult.set(null);
    this.service.test(p.id).subscribe({
      next: (res) => {
        this.testResult.set(res);
        this.testingId.set(null);
      },
      error: () => {
        this.testResult.set({ ok: false, message: 'Connection failed' });
        this.testingId.set(null);
      },
    });
  }
}
