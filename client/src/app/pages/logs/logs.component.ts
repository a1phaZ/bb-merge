import { Component, inject, signal, ElementRef, viewChild, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { LogsService } from '../../core/services/logs.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatSnackBarModule, MatTooltipModule,
    EmptyStateComponent,
  ],
  template: `
    <div class="header">
      <h1 class="page-title mat-headline-4">Logs</h1>
      <button mat-stroked-button color="warn" (click)="deleteAll()" *ngIf="files().length > 0">
        <mat-icon>delete_sweep</mat-icon> Clear All
      </button>
    </div>

    <div *ngIf="!selectedFile()">
      <mat-card>
        <mat-card-content>
          <table mat-table [dataSource]="files()" class="full-width" *ngIf="files().length > 0">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>File</th>
              <td mat-cell *matCellDef="let f">{{ f.name }}</td>
            </ng-container>
            <ng-container matColumnDef="size">
              <th mat-header-cell *matHeaderCellDef>Size</th>
              <td mat-cell *matCellDef="let f">{{ formatSize(f.size) }}</td>
            </ng-container>
            <ng-container matColumnDef="modifiedAt">
              <th mat-header-cell *matHeaderCellDef>Modified</th>
              <td mat-cell *matCellDef="let f">{{ f.modifiedAt | date:'short' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let f">
                <button mat-icon-button (click)="viewFile(f.name)" matTooltip="View">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button (click)="downloadFile(f.name)" matTooltip="Download">
                  <mat-icon>download</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="deleteFile(f.name)" matTooltip="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="['name','size','modifiedAt','actions']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['name','size','modifiedAt','actions'];"></tr>
          </table>

          <app-empty-state *ngIf="files().length === 0" icon="terminal"
            title="No log files"
            description="Application logs will appear here." />
        </mat-card-content>
      </mat-card>
    </div>

    <div *ngIf="selectedFile()">
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ selectedFile() }}</mat-card-title>
          <button mat-icon-button (click)="selectedFile.set(null); stopFollowing()">
            <mat-icon>close</mat-icon>
          </button>
        </mat-card-header>
        <mat-card-content>
          <pre class="log-content" #logContainer>{{ logContent() }}</pre>
          <div class="view-actions">
            <button mat-stroked-button (click)="toggleFollow()" [color]="following() ? 'primary' : ''"
              [disabled]="!selectedFile()">
              <mat-icon>{{ following() ? 'sync' : 'sync_disabled' }}</mat-icon>
              {{ following() ? 'Following...' : 'Follow' }}
            </button>
            <button mat-stroked-button (click)="downloadFile(selectedFile()!)">
              <mat-icon>download</mat-icon> Download
            </button>
            <button mat-stroked-button color="warn" (click)="deleteFile(selectedFile()!); selectedFile.set(null); stopFollowing()">
              <mat-icon>delete</mat-icon> Delete
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
    .log-content { background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 4px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; line-height: 1.5; overflow-x: auto; max-height: 70vh; white-space: pre; }
    .view-actions { display: flex; gap: 8px; margin-top: 16px; }
  `,
})
export class LogsComponent {
  private logsService = inject(LogsService);
  private snackBar = inject(MatSnackBar);
  logContainer = viewChild<ElementRef<HTMLPreElement>>('logContainer');

  files = signal<Array<{ name: string; size: number; createdAt: string; modifiedAt: string }>>([]);
  selectedFile = signal<string | null>(null);
  logContent = signal('');
  following = signal(false);
  private tailSub: Subscription | null = null;

  constructor() {
    this.loadFiles();
  }

  loadFiles() {
    this.logsService.getFiles().subscribe({
      next: (res) => this.files.set(res.files),
    });
  }

  viewFile(name: string) {
    this.stopFollowing();
    this.selectedFile.set(name);
    this.logsService.getContent(name).subscribe({
      next: (content) => this.logContent.set(content),
      error: () => {
        this.logContent.set('Error loading log file');
        this.snackBar.open('Failed to load log file', 'Close', { duration: 3000 });
      },
    });
  }

  toggleFollow() {
    if (this.following()) {
      this.stopFollowing();
    } else {
      this.startFollowing();
    }
  }

  private startFollowing() {
    const name = this.selectedFile();
    if (!name) return;
    this.following.set(true);
    this.tailSub = this.logsService.tailLog(name).subscribe({
      next: (data) => {
        if (data.type === 'init') {
          this.logContent.set(data.content);
        } else if (data.type === 'line') {
          this.logContent.update(c => c + data.content);
        } else if (data.type === 'error') {
          this.snackBar.open('Log tail error', 'Close', { duration: 3000 });
        }
        this.scrollToBottom();
      },
      error: () => {
        this.following.set(false);
        this.snackBar.open('Log tail connection lost', 'Close', { duration: 3000 });
      },
    });
  }

  stopFollowing() {
    this.following.set(false);
    this.tailSub?.unsubscribe();
    this.tailSub = null;
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = this.logContainer()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  downloadFile(name: string) {
    this.logsService.getContent(name).subscribe({
      next: (content) => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }

  deleteFile(name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    this.logsService.deleteAll();
    this.loadFiles();
    this.snackBar.open('File deleted', 'Close', { duration: 2000 });
  }

  deleteAll() {
    if (!confirm('Delete all log files?')) return;
    this.logsService.deleteAll().subscribe(() => {
      this.files.set([]);
      this.snackBar.open('All logs cleared', 'Close', { duration: 2000 });
    });
  }

  ngOnDestroy() {
    this.stopFollowing();
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
