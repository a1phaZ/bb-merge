import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { WebhooksService } from '../../core/services/webhooks.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

export interface WebhookEvent {
  id: number;
  providerId: string;
  eventType: string;
  payloadJson: string;
  receivedAt: string;
}

@Component({
  selector: 'app-webhooks',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatProgressBarModule, MatTooltipModule,
    MatSnackBarModule,
    TranslatePipe, EmptyStateComponent,
  ],
  template: `
    <div class="header">
      <h1 class="page-title mat-headline-4">{{ 'webhooks.title' | translate }}</h1>
      @if (events().length > 0) {
        <div class="header-actions">
          <button mat-stroked-button (click)="refresh()" matTooltip="{{ 'webhooks.refresh' | translate }}">
            <mat-icon>refresh</mat-icon>
          </button>
          <button mat-stroked-button color="warn" (click)="clearAll()" matTooltip="{{ 'webhooks.clearAll' | translate }}">
            <mat-icon>delete_sweep</mat-icon> {{ 'webhooks.clearAllBtn' | translate }}
          </button>
        </div>
      }
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" class="mb-16"></mat-progress-bar>
    }

    @if (error()) {
      <div class="error-banner">
        <mat-icon>error</mat-icon> <span>{{ error() }}</span>
      </div>
    }

    @if (events().length > 0 && !loading()) {
      <div class="table-container">
        <table mat-table [dataSource]="events()" multiTemplateDataRows class="events-table">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>{{ 'webhooks.id' | translate }}</th>
            <td mat-cell *matCellDef="let e">{{ e.id }}</td>
          </ng-container>
          <ng-container matColumnDef="eventType">
            <th mat-header-cell *matHeaderCellDef>{{ 'webhooks.eventType' | translate }}</th>
            <td mat-cell *matCellDef="let e">
              <span class="event-badge">{{ e.eventType }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="providerId">
            <th mat-header-cell *matHeaderCellDef>{{ 'webhooks.provider' | translate }}</th>
            <td mat-cell *matCellDef="let e">{{ e.providerId }}</td>
          </ng-container>
          <ng-container matColumnDef="receivedAt">
            <th mat-header-cell *matHeaderCellDef>{{ 'webhooks.received' | translate }}</th>
            <td mat-cell *matCellDef="let e">{{ e.receivedAt | date:'medium' }}</td>
          </ng-container>
          <ng-container matColumnDef="expand">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let e">
              <button mat-icon-button (click)="togglePayload(e)">
                <mat-icon>{{ expandedEventId() === e.id ? 'expand_less' : 'expand_more' }}</mat-icon>
              </button>
            </td>
          </ng-container>
          <ng-container matColumnDef="expandedDetail">
            <td mat-cell *matCellDef="let e" [attr.colspan]="5">
              @if (expandedEventId() === e.id) {
                <div class="payload-detail">
                  <pre>{{ formatPayload(e.payloadJson) }}</pre>
                </div>
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="['id', 'eventType', 'providerId', 'receivedAt', 'expand']"></tr>
          <tr mat-row *matRowDef="let row; columns: ['id', 'eventType', 'providerId', 'receivedAt', 'expand']"
              class="event-row" (click)="togglePayload(row)"></tr>
          <tr mat-row *matRowDef="let row; columns: ['expandedDetail']" class="detail-row"></tr>
        </table>
      </div>
    }

    @if (!loading() && events().length === 0) {
      <app-empty-state icon="webhook" [title]="'webhooks.none' | translate"
        [description]="'webhooks.noneHint' | translate" />
    }
  `,
  styles: `
    .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
    .header-actions { display: flex; gap: 8px; }
    .mb-16 { margin-bottom: 16px; }
    .error-banner { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #fdecea; border-radius: 4px; color: #b71c1c; margin-bottom: 16px; }
    .table-container { overflow-x: auto; }
    .events-table { width: 100%; }
    .event-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #e3f2fd; font-size: 12px; font-weight: 500; color: #1565c0; }
    .event-row { cursor: pointer; }
    .event-row:hover { background: #fafafa; }
    .detail-row { background: #fafafa; }
    .payload-detail { padding: 12px 16px; }
    .payload-detail pre { margin: 0; background: #263238; color: #eeffff; padding: 16px; border-radius: 4px; font-size: 12px; overflow-x: auto; max-height: 300px; white-space: pre-wrap; word-break: break-all; }
  `,
})
export class WebhooksComponent {
  private webhooksService = inject(WebhooksService);
  private snackBar = inject(MatSnackBar);

  events = signal<WebhookEvent[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  expandedEventId = signal<number | null>(null);

  constructor() {
    this.loadEvents();
  }

  loadEvents() {
    this.loading.set(true);
    this.error.set(null);
    this.webhooksService.getEvents().subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load webhook events');
        this.loading.set(false);
      },
    });
  }

  refresh() {
    this.loadEvents();
  }

  togglePayload(event: WebhookEvent) {
    this.expandedEventId.set(this.expandedEventId() === event.id ? null : event.id);
  }

  formatPayload(json: string): string {
    try {
      return JSON.stringify(JSON.parse(json), null, 2);
    } catch {
      return json;
    }
  }

  clearAll() {
    if (!confirm('Clear all webhook events?')) return;
    this.webhooksService.deleteEvents().subscribe({
      next: () => {
        this.events.set([]);
        this.snackBar.open('Webhook events cleared', 'Close', { duration: 2000 });
      },
      error: (err) => {
        this.snackBar.open(err.message || 'Failed to clear events', 'Close', { duration: 3000 });
      },
    });
  }
}
