import { Component, inject, computed, signal, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';

interface StatsEntry {
  date: string;
  total: number;
  merged: number;
  conflicts: number;
  errors: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatIconModule, MatButtonModule, MatListModule, MatSelectModule,
    TranslatePipe, EmptyStateComponent, TimeAgoPipe,
  ],
  template: `
    <h1 class="page-title mat-headline-4">{{ 'dashboard.title' | translate }}</h1>

    @if (hasProviders()) {
      <div>
        <div class="stats-grid">
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon>merge</mat-icon>
              <div class="stat-value">{{ totalMRs() }}</div>
              <div class="stat-label">{{ 'dashboard.totalMRs' | translate }}</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card merged">
            <mat-card-content>
              <mat-icon>check_circle</mat-icon>
              <div class="stat-value">{{ totalMerged() }}</div>
              <div class="stat-label">{{ 'dashboard.merged' | translate }}</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card conflicted">
            <mat-card-content>
              <mat-icon>warning</mat-icon>
              <div class="stat-value">{{ totalConflicts() }}</div>
              <div class="stat-label">{{ 'dashboard.conflicts' | translate }}</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card error">
            <mat-card-content>
              <mat-icon>error</mat-icon>
              <div class="stat-value">{{ totalErrors() }}</div>
              <div class="stat-label">{{ 'dashboard.errors' | translate }}</div>
            </mat-card-content>
          </mat-card>
        </div>

        @if (stats().length > 0) {
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>{{ 'dashboard.trend' | translate }}</mat-card-title>
              <mat-form-field appearance="fill" subscriptSizing="dynamic" class="days-select">
                <mat-select [value]="selectedDays()" (selectionChange)="selectedDays.set($event.value); loadStats()">
                  <mat-option [value]="7">{{ 'dashboard.7days' | translate }}</mat-option>
                  <mat-option [value]="14">{{ 'dashboard.14days' | translate }}</mat-option>
                  <mat-option [value]="30">{{ 'dashboard.30days' | translate }}</mat-option>
                  <mat-option [value]="90">{{ 'dashboard.90days' | translate }}</mat-option>
                </mat-select>
              </mat-form-field>
            </mat-card-header>
            <mat-card-content>
              <div class="chart-container">
                <div class="chart-y-labels">
                  <span>{{ maxVal() }}</span>
                  <span>{{ halfVal() }}</span>
                  <span>0</span>
                </div>
                <div class="chart-bars">
                  @for (day of stats(); track day.date) {
                    <div class="bar-column">
                      <div class="bar-stack" [style.height]="barHeight(day)">
                        <div class="bar merged" [style.height.%]="pct(day.merged, maxVal())" [title]="day.date + ' merged: ' + day.merged"></div>
                        <div class="bar conflicts" [style.height.%]="pct(day.conflicts, maxVal())" [title]="day.date + ' conflicts: ' + day.conflicts"></div>
                        <div class="bar errors" [style.height.%]="pct(day.errors, maxVal())" [title]="day.date + ' errors: ' + day.errors"></div>
                      </div>
                      <span class="bar-label">{{ day.date.slice(5) }}</span>
                    </div>
                  }
                </div>
              </div>
              <div class="chart-legend">
                <span><span class="legend-dot merged"></span> {{ 'dashboard.merged' | translate }}</span>
                <span><span class="legend-dot conflicts"></span> {{ 'dashboard.conflicts' | translate }}</span>
                <span><span class="legend-dot errors"></span> {{ 'dashboard.errors' | translate }}</span>
              </div>
            </mat-card-content>
          </mat-card>
        }

        <div class="dashboard-grid">
          <mat-card>
            <mat-card-header><mat-card-title>{{ 'dashboard.recentOps' | translate }}</mat-card-title></mat-card-header>
            <mat-card-content>
              @if (recent().length > 0) {
                <mat-list>
                  @for (r of recent(); track r.id) {
                    <mat-list-item>
                      <mat-icon matListItemIcon>{{ r.errorsCount > 0 ? 'error' : 'check_circle' }}</mat-icon>
                      <span matListItemTitle>{{ r.project }}/{{ r.repo }} → {{ r.target }}</span>
                      <span matListItemLine>{{ r.createdAt | timeAgo }} · {{ r.totalBranches }} {{ 'templates.count' | translate }} · {{ r.mergedCount }} {{ 'dashboard.merged' | translate | lowercase }}</span>
                    </mat-list-item>
                  }
                </mat-list>
              }
              @if (recent().length === 0) {
                <p class="empty-note">{{ 'dashboard.noOps' | translate }}</p>
              }
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header><mat-card-title>{{ 'dashboard.providers' | translate }}</mat-card-title></mat-card-header>
            <mat-card-content>
              <mat-list>
                @for (p of providers(); track p.id) {
                  <mat-list-item>
                    <mat-icon matListItemIcon [style.color]="'#2e7d32'">check_circle</mat-icon>
                    <span matListItemTitle>{{ p.name }}</span>
                    <span matListItemLine>{{ p.type }} · {{ p.apiUrl }}</span>
                  </mat-list-item>
                }
              </mat-list>
              @if (providers().length === 0) {
                <p class="empty-note">{{ 'dashboard.noProviders' | translate }}</p>
              }
            </mat-card-content>
          </mat-card>
        </div>

        <div class="quick-actions">
          <button mat-raised-button color="primary" routerLink="/merge-request/new">
            <mat-icon>add</mat-icon> {{ 'dashboard.newMr' | translate }}
          </button>
          <button mat-raised-button routerLink="/browser">
            <mat-icon>account_tree</mat-icon> {{ 'dashboard.browse' | translate }}
          </button>
          <button mat-stroked-button routerLink="/history">
            <mat-icon>history</mat-icon> {{ 'dashboard.history' | translate }}
          </button>
          <button mat-stroked-button routerLink="/providers">
            <mat-icon>cloud</mat-icon> {{ 'dashboard.manageProviders' | translate }}
          </button>
        </div>
      </div>
    } @else {
      <app-empty-state icon="cloud" [title]="'dashboard.welcome' | translate"
        [description]="'dashboard.addProviderHint' | translate">
        <button mat-raised-button color="primary" routerLink="/providers">{{ 'dashboard.addProvider' | translate }}</button>
      </app-empty-state>
    }
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
    .chart-card { margin-bottom: 24px; }
    .chart-card mat-card-header { display: flex; justify-content: space-between; align-items: center; }
    .days-select { width: 120px; }
    .chart-container { display: flex; gap: 8px; height: 200px; margin-top: 8px; }
    .chart-y-labels { display: flex; flex-direction: column; justify-content: space-between; padding: 2px 4px 22px 0; font-size: 11px; color: rgba(0,0,0,0.5); min-width: 32px; text-align: right; }
    .chart-bars { display: flex; flex: 1; align-items: flex-end; gap: 3px; }
    .bar-column { flex: 1; display: flex; flex-direction: column; align-items: center; min-width: 4px; height: 100%; justify-content: flex-end; }
    .bar-stack { width: 100%; display: flex; flex-direction: column-reverse; border-radius: 3px 3px 0 0; overflow: hidden; transition: height 0.3s ease; }
    .bar { width: 100%; min-height: 1px; transition: height 0.3s ease; }
    .bar.merged { background: #2e7d32; }
    .bar.conflicts { background: #e65100; }
    .bar.errors { background: #c62828; }
    .bar-label { font-size: 9px; color: rgba(0,0,0,0.5); margin-top: 4px; white-space: nowrap; transform: rotate(-45deg); transform-origin: left top; }
    .chart-legend { display: flex; gap: 16px; justify-content: center; margin-top: 12px; font-size: 12px; color: rgba(0,0,0,0.7); }
    .legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
    .legend-dot.merged { background: #2e7d32; }
    .legend-dot.conflicts { background: #e65100; }
    .legend-dot.errors { background: #c62828; }
    .dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    @media (max-width: 768px) { .dashboard-grid { grid-template-columns: 1fr; } }
    .empty-note { text-align: center; padding: 16px; color: rgba(0,0,0,0.4); }
    .quick-actions { display: flex; gap: 12px; flex-wrap: wrap; }
  `,
})
export class DashboardComponent implements OnDestroy {
  private statsSub?: Subscription;
  private api = inject(ApiService);

  providers = computed(() => this.api.providers.value() ?? []);
  historyRes = this.api.getHistory({ limit: 100, page: 1 });

  stats = signal<StatsEntry[]>([]);
  selectedDays = signal(30);

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

  maxVal = computed(() => Math.max(...this.stats().map(d => d.total), 1));
  halfVal = computed(() => Math.round(this.maxVal() / 2));

  constructor() {
    this.loadStats();
  }

  hasProviders() {
    return this.providers().length > 0;
  }

  loadStats() {
    this.statsSub?.unsubscribe();
    this.statsSub = this.api.getHistoryStats(this.selectedDays()).subscribe({
      next: (data) => this.stats.set(data),
    });
  }

  ngOnDestroy() {
    this.statsSub?.unsubscribe();
  }

  barHeight(day: StatsEntry): string {
    const p = this.maxVal() > 0 ? (day.total / this.maxVal()) * 100 : 0;
    return `max(4px, ${p}%)`;
  }

  pct(val: number, max: number): number {
    return max > 0 ? (val / max) * 100 : 0;
  }
}
