import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { GitBranch } from '../../shared/models/provider.model';

@Component({
  selector: 'app-browser',
  standalone: true,
  imports: [
    CommonModule, FormField,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTableModule, MatProgressBarModule, MatTooltipModule,
    TranslatePipe, EmptyStateComponent,
  ],
  template: `
    <div class="header">
      <h1 class="page-title mat-headline-4">{{ 'browser.title' | translate }}</h1>
    </div>

    <mat-card class="search-card">
      <mat-card-content>
        <div class="search-grid">
          <mat-form-field appearance="fill">
            <mat-label>{{ 'browser.provider' | translate }}</mat-label>
            <mat-select [formField]="browserForm.providerId" (selectionChange)="clearResults()">
              <mat-option [value]="">{{ 'browser.selectProvider' | translate }}</mat-option>
              @for (p of providers(); track p.id) {
                <mat-option [value]="p.id">{{ p.name }} ({{ p.type }})</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>{{ 'browser.project' | translate }}</mat-label>
            <input matInput [formField]="browserForm.project" placeholder="PROJ">
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>{{ 'browser.repository' | translate }}</mat-label>
            <input matInput [formField]="browserForm.repo" placeholder="my-repo">
          </mat-form-field>
        </div>
        <div class="search-actions">
          <button mat-raised-button color="primary" (click)="loadBranches()"
            [disabled]="!browserModel().providerId || !browserModel().project || !browserModel().repo || loading()">
            <mat-icon>account_tree</mat-icon> {{ 'browser.load' | translate }}
          </button>
        </div>
      </mat-card-content>
    </mat-card>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" class="mb-16"></mat-progress-bar>
    }

    @if (error()) {
      <div class="error-banner">
        <mat-icon>error</mat-icon> <span>{{ error() }}</span>
      </div>
    }

    @if (branches().length > 0) {
      <div class="branch-count">
        {{ branches().length }} {{ 'browser.found' | translate }}
      </div>
    }

    @if (branches().length > 0) {
      <div class="table-container">
        <table mat-table [dataSource]="branches()" class="branches-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>{{ 'browser.branch' | translate }}</th>
            <td mat-cell *matCellDef="let b">
              <div class="branch-name">
                <mat-icon class="branch-icon">call_split</mat-icon>
                <span>{{ b.displayId || b.name }}</span>
              </div>
            </td>
          </ng-container>
          <ng-container matColumnDef="commit">
            <th mat-header-cell *matHeaderCellDef>{{ 'browser.latestCommit' | translate }}</th>
            <td mat-cell *matCellDef="let b">
              <code class="commit-hash">{{ (b.latestCommit || b.sha || '').substring(0, 8) }}</code>
            </td>
          </ng-container>
          <ng-container matColumnDef="author">
            <th mat-header-cell *matHeaderCellDef>{{ 'browser.author' | translate }}</th>
            <td mat-cell *matCellDef="let b">{{ b.author?.displayName || (b.author?.name || '-') }}</td>
          </ng-container>
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>{{ 'browser.lastUpdated' | translate }}</th>
            <td mat-cell *matCellDef="let b">{{ (b.commitDate || b.date || '') | date:'short' }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="['name', 'commit', 'author', 'date']"></tr>
          <tr mat-row *matRowDef="let row; columns: ['name', 'commit', 'author', 'date'];" class="branch-row"></tr>
        </table>
      </div>
    }

    @if (!loading() && !error() && loaded() && branches().length === 0) {
      <app-empty-state icon="account_tree" [title]="'browser.none' | translate"
        [description]="'browser.noneHint' | translate" />
    }

    @if (!loading() && !loaded()) {
      <app-empty-state icon="search"
        title="Search branches"
        description="Select a provider, enter project and repository name, then click Load Branches." />
    }
  `,
  styles: `
    .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
    .search-card { margin-bottom: 20px; }
    .search-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    @media (max-width: 800px) { .search-grid { grid-template-columns: 1fr; } }
    .search-actions { display: flex; gap: 8px; margin-top: 8px; }
    .mb-16 { margin-bottom: 16px; }
    .error-banner { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #fdecea; border-radius: 4px; color: #b71c1c; margin-bottom: 16px; }
    .branch-count { font-size: 14px; color: rgba(0,0,0,0.5); margin-bottom: 12px; }
    .table-container { overflow-x: auto; }
    .branches-table { width: 100%; }
    .branch-name { display: flex; align-items: center; gap: 6px; }
    .branch-icon { font-size: 20px; height: 20px; width: 20px; color: rgba(0,0,0,0.35); }
    .commit-hash { font-family: monospace; background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
    .branch-row:hover { background: #fafafa; }
  `,
})
export class BrowserComponent {
  private api = inject(ApiService);

  providers = computed(() => this.api.providers.value() ?? []);

  browserModel = signal({ providerId: '', project: '', repo: '' });
  browserForm = form(this.browserModel);

  branches = signal<GitBranch[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  loaded = signal(false);

  clearResults() {
    this.branches.set([]);
    this.error.set(null);
    this.loaded.set(false);
  }

  loadBranches() {
    const f = this.browserModel();
    if (!f.providerId || !f.project || !f.repo) return;

    this.loading.set(true);
    this.error.set(null);
    this.branches.set([]);

    this.api.getBranches(f.providerId, f.project, f.repo).subscribe({
      next: (branches) => {
        this.branches.set(branches);
        this.loaded.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || err.message || 'Failed to load branches');
        this.loading.set(false);
        this.loaded.set(true);
      },
    });
  }
}
