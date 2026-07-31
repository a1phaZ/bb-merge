import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { TranslatePipe } from '@ngx-translate/core';
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
    CommonModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatPaginatorModule, MatSnackBarModule, MatTooltipModule,
    TranslatePipe, EmptyStateComponent, TimeAgoPipe,
  ],
  template: `
    <div class="header">
      <h1 class="page-title mat-headline-4">{{ 'history.title' | translate }}</h1>
      <div class="header-actions">
        @if (total() > 0) {
          <button mat-stroked-button color="warn" (click)="clearAll()">
            <mat-icon>delete_sweep</mat-icon> {{ 'history.clearAll' | translate }}
          </button>
        }
      </div>
    </div>

    @if (total() > 0) {
      <mat-card class="filters-card">
        <mat-card-content>
          <div class="filters">
            <mat-form-field appearance="fill" subscriptSizing="dynamic">
              <mat-label>{{ 'history.provider' | translate }}</mat-label>
              <mat-select [value]="filterProvider()" (selectionChange)="filterProvider.set($event.value)">
                <mat-option value="">{{ 'history.all' | translate }}</mat-option>
                @for (p of providers(); track p.id) {
                  <mat-option [value]="p.id">{{ p.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="fill" subscriptSizing="dynamic">
              <mat-label>{{ 'history.search' | translate }}</mat-label>
              <input matInput [value]="filterSearch()" (input)="filterSearch.set($any($event).target.value); searchChanged()" placeholder="project, repo, or branch">
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>
    }

    <mat-card>
      <mat-card-content>
        @if (items().length > 0) {
          <table mat-table [dataSource]="items()" class="full-width">
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>{{ 'history.date' | translate }}</th>
              <td mat-cell *matCellDef="let r">{{ r.createdAt | timeAgo }}</td>
            </ng-container>
            <ng-container matColumnDef="providerType">
              <th mat-header-cell *matHeaderCellDef>{{ 'history.type' | translate }}</th>
              <td mat-cell *matCellDef="let r">
                <span class="type-badge" [class.bitbucket]="r.providerType==='bitbucket'"
                      [class.gitlab]="r.providerType==='gitlab'"
                      [class.github]="r.providerType==='github'">{{ r.providerType }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="project">
              <th mat-header-cell *matHeaderCellDef>{{ 'history.projectRepo' | translate }}</th>
              <td mat-cell *matCellDef="let r">{{ r.project }}/{{ r.repo }}</td>
            </ng-container>
            <ng-container matColumnDef="target">
              <th mat-header-cell *matHeaderCellDef>{{ 'history.target' | translate }}</th>
              <td mat-cell *matCellDef="let r">{{ r.target }}</td>
            </ng-container>
            <ng-container matColumnDef="totalBranches">
              <th mat-header-cell *matHeaderCellDef>{{ 'history.branches' | translate }}</th>
              <td mat-cell *matCellDef="let r">{{ r.totalBranches }}</td>
            </ng-container>
            <ng-container matColumnDef="mergedCount">
              <th mat-header-cell *matHeaderCellDef>{{ 'history.mergedLabel' | translate }}</th>
              <td mat-cell *matCellDef="let r">{{ r.mergedCount }}</td>
            </ng-container>
            <ng-container matColumnDef="errorsCount">
              <th mat-header-cell *matHeaderCellDef>{{ 'history.errors' | translate }}</th>
              <td mat-cell *matCellDef="let r">
                @if (r.errorsCount > 0) {
                  <span class="badge error">{{ r.errorsCount }}</span>
                }
                @if (r.errorsCount === 0) {
                  <span>0</span>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let r">
                <button mat-icon-button (click)="toggleDetail(r.id)" matTooltip="{{ 'history.details' | translate }}">
                  <mat-icon>{{ expandedId() === r.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>

            <tr [style.display]="detail() ? 'table-row' : 'none'">
              <td [attr.colspan]="columns.length">
                @if (detail(); as d) {
                  <div class="detail-row">
                    <div class="detail-info">
                      <p><strong>ID:</strong> {{ d.id }}</p>
                      <p><strong>{{ 'mrNew.strategy' | translate }}:</strong> {{ d.strategy }}</p>
                      <p><strong>{{ 'mrNew.autoMerge' | translate }}:</strong> {{ d.autoMerge ? ('history.yes' | translate) : ('history.no' | translate) }}</p>
                      <p><strong>{{ 'history.date' | translate }}:</strong> {{ d.createdAt | date:'medium' }}</p>
                    </div>
                    @if (detailBranches().length > 0) {
                      <div class="detail-branches">
                        <strong>{{ 'history.branches' | translate }}:</strong>
                        @for (b of detailBranches(); track $index) {
                          <div class="branch-chip" [class]="'status-' + b.status">
                            {{ b.branch }}
                            @if (b.status !== 'unknown') {
                              <span class="branch-status">({{ b.status }})</span>
                            }
                          </div>
                        }
                      </div>
                    }
                    <div class="detail-stats">
                      <div class="stat"><span class="green">●</span> {{ 'history.mergedLabel' | translate }}: {{ d.mergedCount }}</div>
                      <div class="stat"><span class="red">●</span> {{ 'history.errors' | translate }}: {{ d.errorsCount }}</div>
                      <div class="stat"><span class="orange">●</span> {{ 'history.conflicts' | translate }}: {{ d.conflictsCount }}</div>
                      <div class="stat"><span class="gray">●</span> {{ 'history.skipped' | translate }}: {{ d.skippedCount }}</div>
                    </div>
                    <div class="detail-actions">
                      <button mat-stroked-button (click)="rerun(d)" matTooltip="{{ 'history.rerun' | translate }}">
                        <mat-icon>replay</mat-icon> {{ 'history.rerun' | translate }}
                      </button>
                    </div>
                  </div>
                }
              </td>
            </tr>
          </table>
        }

        @if (items().length === 0) {
          <app-empty-state icon="history"
            [title]="'history.none' | translate"
            [description]="'history.noneHint' | translate" />
        }

        @if (total() > limit()) {
          <mat-paginator [length]="total()" [pageSize]="limit()"
            [pageIndex]="page() - 1" (page)="onPage($event)" showFirstLastButtons>
          </mat-paginator>
        }
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
    .branch-chip { display: inline-block; padding: 2px 8px; margin: 2px; border-radius: 4px; font-size: 12px; }
    .branch-chip.status-merged { background: #e8f5e9; color: #2e7d32; }
    .branch-chip.status-created { background: #e3f2fd; color: #1565c0; }
    .branch-chip.status-conflicted { background: #fff3e0; color: #e65100; }
    .branch-chip.status-skipped { background: #f5f5f5; color: #757575; }
    .branch-chip.status-error { background: #ffebee; color: #c62828; }
    .branch-chip.status-unknown { background: #e0e0e0; color: #616161; }
    .branch-status { margin-left: 4px; font-weight: 500; }
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
  filterProvider = signal('');
  filterSearch = signal('');
  expandedId = signal<string | null>(null);
  detail = signal<HistoryRecord | null>(null);

  providers = computed(() => this.api.providers.value() ?? []);
  columns = ['createdAt', 'providerType', 'project', 'target', 'totalBranches', 'mergedCount', 'errorsCount', 'actions'];

  private searchSubject = new Subject<void>();

  detailBranches = computed<Array<{ branch: string; status: string; prId?: number; error?: string }>>(() => {
    const d = this.detail();
    if (!d?.resultsJson) return [];
    try {
      const parsed = JSON.parse(d.resultsJson);
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && typeof parsed[0] === 'string') {
          return (parsed as string[]).map(b => ({ branch: b, status: 'unknown' }));
        }
        return parsed as Array<{ branch: string; status: string; prId?: number; error?: string }>;
      }
    } catch { /* ignore */ }
    return [];
  });

  constructor() {
    this.searchSubject.pipe(debounceTime(300)).subscribe(() => this.load());
    this.load();
  }

  load() {
    this.historyService.getList({
      page: this.page() + 1,
      limit: this.limit(),
      providerId: this.filterProvider() || undefined,
      search: this.filterSearch() || undefined,
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
    const found = this.items().find(item => item.id === id);
    this.detail.set(found ?? null);
    if (!found) this.expandedId.set(null);
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
