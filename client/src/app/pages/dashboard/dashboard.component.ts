import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { ApiService } from '../../core/services/api.service';
import { HistoryService } from '../../core/services/history.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { HistoryRecord } from '../../shared/models/history.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatIconModule, MatButtonModule, MatListModule,
    EmptyStateComponent, TimeAgoPipe,
  ],
  template: `
    <h1 class="page-title mat-headline-4">Dashboard</h1>

    <div *ngIf="hasProviders(); else noProviders">
      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon>merge</mat-icon>
            <div class="stat-value">{{ totalMRs() }}</div>
            <div class="stat-label">Total Merge Requests</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card merged">
          <mat-card-content>
            <mat-icon>check_circle</mat-icon>
            <div class="stat-value">{{ totalMerged() }}</div>
            <div class="stat-label">Merged</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card conflicted">
          <mat-card-content>
            <mat-icon>warning</mat-icon>
            <div class="stat-value">{{ totalConflicts() }}</div>
            <div class="stat-label">Conflicts</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card error">
          <mat-card-content>
            <mat-icon>error</mat-icon>
            <div class="stat-value">{{ totalErrors() }}</div>
            <div class="stat-label">Errors</div>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="dashboard-grid">
        <mat-card>
          <mat-card-header><mat-card-title>Recent Operations</mat-card-title></mat-card-header>
          <mat-card-content>
            <mat-list *ngIf="recent().length > 0">
              <mat-list-item *ngFor="let r of recent()">
                <mat-icon matListItemIcon>{{ r.errorsCount > 0 ? 'error' : 'check_circle' }}</mat-icon>
                <span matListItemTitle>{{ r.project }}/{{ r.repo }} → {{ r.target }}</span>
                <span matListItemLine>{{ r.createdAt | timeAgo }} · {{ r.totalBranches }} branches · {{ r.mergedCount }} merged</span>
              </mat-list-item>
            </mat-list>
            <p *ngIf="recent().length === 0" class="empty-note">No operations yet.</p>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header><mat-card-title>Providers</mat-card-title></mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item *ngFor="let p of providers()">
                <mat-icon matListItemIcon [style.color]="'#2e7d32'">check_circle</mat-icon>
                <span matListItemTitle>{{ p.name }}</span>
                <span matListItemLine>{{ p.type }} · {{ p.apiUrl }}</span>
              </mat-list-item>
            </mat-list>
            <p *ngIf="providers().length === 0" class="empty-note">No providers configured.</p>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="quick-actions">
        <button mat-raised-button color="primary" routerLink="/merge-request/new">
          <mat-icon>add</mat-icon> New Merge Request
        </button>
        <button mat-raised-button routerLink="/browser">
          <mat-icon>account_tree</mat-icon> Browse Branches
        </button>
        <button mat-stroked-button routerLink="/history">
          <mat-icon>history</mat-icon> View History
        </button>
        <button mat-stroked-button routerLink="/providers">
          <mat-icon>cloud</mat-icon> Manage Providers
        </button>
      </div>
    </div>

    <ng-template #noProviders>
      <app-empty-state icon="cloud" title="Welcome to Merge Request Creator"
        description="Add your first Git provider to start creating merge requests.">
        <button mat-raised-button color="primary" routerLink="/providers">Add Provider</button>
      </app-empty-state>
    </ng-template>
  `,
  styles: `
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px; }
    .stat-card { text-align: center; }
    .stat-card mat-card-content { padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .stat-card mat-icon { font-size: 36px; height: 36px; width: 36px; }
    .stat-card.merged mat-icon { color: #2e7d32; }
    .stat-card.conflicted mat-icon { color: #e65100; }
    .stat-card.error mat-icon { color: #c62828; }
    .stat-value { font-size: 28px; font-weight: 500; }
    .stat-label { font-size: 13px; color: rgba(0,0,0,0.6); text-transform: uppercase; letter-spacing: 0.5px; }
    .dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    @media (max-width: 768px) { .dashboard-grid { grid-template-columns: 1fr; } }
    .empty-note { text-align: center; padding: 16px; color: rgba(0,0,0,0.4); }
    .quick-actions { display: flex; gap: 12px; flex-wrap: wrap; }
  `,
})
export class DashboardComponent {
  private api = inject(ApiService);
  private historyService = inject(HistoryService);

  providers = computed(() => this.api.providers.value() ?? []);
  historyRes = this.historyService.getList({ limit: 100, page: 1 });

  recent = computed(() => {
    const h = this.historyRes.value();
    return h?.items?.slice(0, 5) ?? [];
  });

  totalMRs = computed(() => this.historyRes.value()?.total ?? 0);

  totalMerged = computed(() =>
    (this.historyRes.value()?.items ?? []).reduce((s, r) => s + r.mergedCount, 0)
  );

  totalConflicts = computed(() =>
    (this.historyRes.value()?.items ?? []).reduce((s, r) => s + r.conflictsCount, 0)
  );

  totalErrors = computed(() =>
    (this.historyRes.value()?.items ?? []).reduce((s, r) => s + r.errorsCount, 0)
  );

  hasProviders() {
    return this.providers().length > 0;
  }
}
