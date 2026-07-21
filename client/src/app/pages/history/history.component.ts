import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HistoryService } from '../../core/services/history.service';
import { ApiService } from '../../core/services/api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { HistoryRecord } from '../../shared/models/history.model';
import { debounceTime, Subject } from 'rxjs';


@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatPaginatorModule, MatSnackBarModule, MatTooltipModule,
    EmptyStateComponent, TimeAgoPipe,
  ],
  template: `
    <div class="header">
      <h1 class="page-title mat-headline-4">History</h1>
      <div class="header-actions">
        <button mat-stroked-button color="warn" (click)="clearAll()" *ngIf="total() > 0">
          <mat-icon>delete_sweep</mat-icon> Clear All
        </button>
      </div>
    </div>

    <mat-card class="filters-card" *ngIf="total() > 0">
      <mat-card-content>
        <div class="filters">
          <mat-form-field appearance="fill" subscriptSizing="dynamic">
            <mat-label>Provider</mat-label>
            <mat-select [(ngModel)]="filterProvider">
              <mat-option value="">All</mat-option>
              <mat-option *ngFor="let p of providers()" [value]="p.id">{{ p.name }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill" subscriptSizing="dynamic">
            <mat-label>Search</mat-label>
            <input matInput [(ngModel)]="filterSearch" (input)="searchChanged()" placeholder="project, repo, or branch">
          </mat-form-field>
        </div>
      </mat-card-content>
    </mat-card>

    <mat-card>
      <mat-card-content>
        <table mat-table [dataSource]="items()" class="full-width" *ngIf="items().length > 0">
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>Date</th>
            <td mat-cell *matCellDef="let r">{{ r.createdAt | timeAgo }}</td>
          </ng-container>
          <ng-container matColumnDef="providerType">
            <th mat-header-cell *matHeaderCellDef>Type</th>
            <td mat-cell *matCellDef="let r">
              <span class="type-badge" [class.bitbucket]="r.providerType==='bitbucket'"
                    [class.gitlab]="r.providerType==='gitlab'"
                    [class.github]="r.providerType==='github'">{{ r.providerType }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="project">
            <th mat-header-cell *matHeaderCellDef>Project / Repo</th>
            <td mat-cell *matCellDef="let r">{{ r.project }}/{{ r.repo }}</td>
          </ng-container>
          <ng-container matColumnDef="target">
            <th mat-header-cell *matHeaderCellDef>Target</th>
            <td mat-cell *matCellDef="let r">{{ r.target }}</td>
          </ng-container>
          <ng-container matColumnDef="totalBranches">
            <th mat-header-cell *matHeaderCellDef>Branches</th>
            <td mat-cell *matCellDef="let r">{{ r.totalBranches }}</td>
          </ng-container>
          <ng-container matColumnDef="mergedCount">
            <th mat-header-cell *matHeaderCellDef>Merged</th>
            <td mat-cell *matCellDef="let r">{{ r.mergedCount }}</td>
          </ng-container>
          <ng-container matColumnDef="errorsCount">
            <th mat-header-cell *matHeaderCellDef>Errors</th>
            <td mat-cell *matCellDef="let r">
              <span *ngIf="r.errorsCount > 0" class="badge error">{{ r.errorsCount }}</span>
              <span *ngIf="r.errorsCount === 0">0</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let r">
              <button mat-icon-button (click)="toggleDetail(r.id)" matTooltip="Details">
                <mat-icon>{{ expandedId() === r.id ? 'expand_less' : 'expand_more' }}</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>

          <tr *ngIf="expandedId()">
            <td [attr.colspan]="columns.length">
              <div class="detail-row">
                <div class="detail-info">
                  <p><strong>ID:</strong> {{ detail()?.id }}</p>
                  <p><strong>Strategy:</strong> {{ detail()?.strategy }}</p>
                  <p><strong>Auto-merge:</strong> {{ detail()?.autoMerge ? 'Yes' : 'No' }}</p>
                  <p><strong>Created:</strong> {{ detail()?.createdAt | date:'medium' }}</p>
                </div>
                <div class="detail-branches" *ngIf="detailBranches().length > 0">
                  <strong>Branches:</strong>
                  <div class="branch-chip" *ngFor="let b of detailBranches()">{{ b }}</div>
                </div>
                <div class="detail-stats">
                  <div class="stat"><span class="green">●</span> Merged: {{ detail()?.mergedCount }}</div>
                  <div class="stat"><span class="red">●</span> Errors: {{ detail()?.errorsCount }}</div>
                  <div class="stat"><span class="orange">●</span> Conflicts: {{ detail()?.conflictsCount }}</div>
                  <div class="stat"><span class="gray">●</span> Skipped: {{ detail()?.skippedCount }}</div>
                </div>
                <div class="detail-actions">
                  <button mat-stroked-button (click)="rerun(detail()!)" matTooltip="Re-run this merge request configuration">
                    <mat-icon>replay</mat-icon> Rerun
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </table>

        <app-empty-state *ngIf="items().length === 0" icon="history"
          title="No history yet"
          description="Completed merge requests will appear here." />

        <mat-paginator *ngIf="total() > limit()" [length]="total()" [pageSize]="limit()"
          [pageIndex]="page() - 1" (page)="onPage($event)" showFirstLastButtons>
        </mat-paginator>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
    .header-actions { display: flex; gap: 8px; }
    .filters-card { margin-bottom: 20px; }
    .filters { display: flex; gap: 16px; flex-wrap: wrap; }
    .type-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; text-transform: uppercase; background: #e0e0e0; }
    .type-badge.bitbucket { background: #e3f2fd; color: #1565c0; }
    .type-badge.gitlab { background: #fff3e0; color: #e65100; }
    .type-badge.github { background: #e8f5e9; color: #2e7d32; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 500; }
    .badge.error { background: #ffebee; color: #c62828; }
    .detail-row { padding: 16px 24px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; background: #fafafa; }
    @media (max-width: 768px) { .detail-row { grid-template-columns: 1fr; } }
    .detail-info p { margin: 4px 0; font-size: 13px; }
    .branch-chip { display: inline-block; padding: 2px 8px; margin: 2px; border-radius: 4px; background: #e0e0e0; font-size: 12px; }
    .detail-stats .stat { margin: 4px 0; font-size: 13px; }
    .green { color: #2e7d32; } .red { color: #c62828; } .orange { color: #e65100; } .gray { color: #757575; }
  `,
})
export class HistoryComponent {
  private historyService = inject(HistoryService);
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  page = signal(0);
  limit = signal(50);
  total = signal(0);
  items = signal<HistoryRecord[]>([]);
  filterProvider = '';
  filterSearch = '';
  expandedId = signal<string | null>(null);
  detail = signal<HistoryRecord | null>(null);

  providers = computed(() => this.api.providers.value() ?? []);
  columns = ['createdAt', 'providerType', 'project', 'target', 'totalBranches', 'mergedCount', 'errorsCount', 'actions'];

  private searchSubject = new Subject<void>();

  detailBranches = computed(() => {
    const d = this.detail();
    if (!d?.resultsJson) return [];
    try { return JSON.parse(d.resultsJson); } catch { return []; }
  });

  constructor() {
    this.searchSubject.pipe(debounceTime(300)).subscribe(() => this.load());
    this.load();
  }

  load() {
    this.historyService.getList({
      page: this.page() + 1,
      limit: this.limit(),
      providerId: this.filterProvider || undefined,
      search: this.filterSearch || undefined,
    }).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.total.set(result.total);
      },
    });
  }

  searchChanged() {
    this.searchSubject.next();
  }

  onPage(event: PageEvent) {
    this.page.set(event.pageIndex);
    this.limit.set(event.pageSize);
    this.load();
  }

  toggleDetail(id: string) {
    if (this.expandedId() === id) {
      this.expandedId.set(null);
      this.detail.set(null);
      return;
    }
    this.expandedId.set(id);
    this.historyService.getItem(id).subscribe({
      next: (item) => this.detail.set(item),
      error: () => this.expandedId.set(null),
    });
  }

  clearAll() {
    if (!confirm('Delete all history records?')) return;
    this.historyService.deleteAll().subscribe(() => {
      this.total.set(0);
      this.items.set([]);
      this.snackBar.open('History cleared', 'Close', { duration: 2000 });
    });
  }

  rerun(record: HistoryRecord) {
    this.router.navigate(['/merge-request/new'], { state: { config: record } });
  }
}
