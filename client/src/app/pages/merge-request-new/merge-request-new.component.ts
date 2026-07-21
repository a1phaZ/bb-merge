import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { ApiService } from '../../core/services/api.service';
import { MergeRequestService } from '../../core/services/merge-request.service';
import { TemplatesService } from '../../core/services/templates.service';
import { ProgressEvent } from '../../shared/models/merge-result.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-merge-request-new',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSlideToggleModule, MatProgressBarModule, MatSnackBarModule, MatExpansionModule,
  ],
  template: `
    <h1 class="page-title mat-headline-4">New Merge Request</h1>

    <div *ngIf="step() === 'form'">
      <mat-card class="form-card">
        <mat-card-content>
          <div class="form-grid">
            <mat-form-field appearance="fill">
              <mat-label>Provider</mat-label>
              <mat-select [(ngModel)]="form.providerId">
                <mat-option *ngFor="let p of providers()" [value]="p.id">
                  {{ p.name }} ({{ p.type }})
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Project</mat-label>
              <input matInput [(ngModel)]="form.project" placeholder="MY_PROJECT">
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Repository</mat-label>
              <input matInput [(ngModel)]="form.repo" placeholder="my-repo">
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Target Branch</mat-label>
              <input matInput [(ngModel)]="form.target" placeholder="main">
            </mat-form-field>
          </div>

          <div class="load-branches-row mt-16">
            <button mat-stroked-button (click)="loadBranches()"
              [disabled]="!form.providerId || !form.project || !form.repo || loadingBranches()">
              <mat-icon>download</mat-icon>
              {{ loadingBranches() ? 'Loading...' : 'Load Branches' }}
            </button>
            <span class="branch-count" *ngIf="loadedBranches().length > 0">
              {{ loadedBranches().length }} branches loaded
            </span>
          </div>

          <mat-form-field appearance="fill" class="full-width mt-16">
            <mat-label>Source Branches (one per line)</mat-label>
            <textarea matInput rows="5" [(ngModel)]="branchesText" placeholder="feature/new-feature&#10;bugfix/issue-123&#10;hotfix/critical"></textarea>
          </mat-form-field>

          <div class="branch-chips" *ngIf="loadedBranches().length > 0">
            <span class="chip" *ngFor="let b of loadedBranches()" (click)="addBranch(b.displayId)">
              {{ b.displayId }}
            </span>
          </div>

          <div class="form-grid mt-16">
            <mat-form-field appearance="fill">
              <mat-label>Title Prefix</mat-label>
              <input matInput [(ngModel)]="form.titlePrefix" placeholder="Merge">
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Strategy</mat-label>
              <mat-select [(ngModel)]="form.strategy">
                <mat-option value="merge">Merge Commit</mat-option>
                <mat-option value="squash">Squash</mat-option>
                <mat-option value="fast-forward">Fast Forward</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-form-field appearance="fill" class="full-width mt-16">
            <mat-label>Description (optional)</mat-label>
            <textarea matInput rows="3" [(ngModel)]="form.description" placeholder="Auto-created merge request"></textarea>
          </mat-form-field>

          <div class="toggle-row mt-16">
            <mat-slide-toggle [(ngModel)]="form.autoMerge">Auto-merge after creation</mat-slide-toggle>
          </div>

          <div class="toggle-row mt-16">
            <mat-slide-toggle [(ngModel)]="form.dryRun">Dry run (validate only, no changes)</mat-slide-toggle>
          </div>

          <mat-accordion class="mt-16">
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>Webhook</mat-panel-title>
                <mat-panel-description>Register a webhook after creation</mat-panel-description>
              </mat-expansion-panel-header>
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Webhook URL</mat-label>
                <input matInput [(ngModel)]="form.webhookUrl" placeholder="https://hooks.example.com/webhook">
              </mat-form-field>
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Events</mat-label>
                <input matInput [(ngModel)]="webhookEventsText" placeholder="pr:merged, pr:updated">
                <mat-hint>Comma-separated event types</mat-hint>
              </mat-form-field>
            </mat-expansion-panel>
          </mat-accordion>

          <div class="form-actions mt-16">
            <button mat-raised-button [color]="form.dryRun ? 'accent' : 'primary'" (click)="execute()"
              [disabled]="!canExecute() || executing()" size="large">
              <mat-icon>{{ form.dryRun ? 'science' : 'play_arrow' }}</mat-icon>
              {{ executing() ? (form.dryRun ? 'Validating...' : 'Creating...') : (form.dryRun ? 'Run Dry Run' : 'Create Merge Requests') }}
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>

    <div *ngIf="step() === 'progress'">
      <mat-card>
        <mat-card-content>
          <h3>
            <ng-container *ngIf="form.dryRun; else realModeTitle">Dry Run Validation</ng-container>
            <ng-template #realModeTitle>Creating Merge Requests</ng-template>
            <span class="badge" [class.badge-dry]="form.dryRun" *ngIf="form.dryRun">DRY RUN</span>
          </h3>
          <mat-progress-bar mode="indeterminate" *ngIf="!progressDone()"></mat-progress-bar>

          <div class="event-list">
            <div *ngFor="let ev of events()" class="event-item" [class.done]="ev.type === 'success'"
                 [class.error]="ev.type === 'error'" [class.warning]="ev.type === 'warning'">
              <mat-icon>{{ eventIcon(ev.type) }}</mat-icon>
              <span class="event-message">{{ ev.message }}</span>
              <span class="event-branch" *ngIf="ev.branch">{{ ev.branch }}</span>
              <span class="event-pr" *ngIf="ev.prId">#{{ ev.prId }}</span>
            </div>
          </div>

          <div class="form-actions mt-16" *ngIf="progressDone()">
            <button mat-raised-button (click)="switchToReal()" *ngIf="form.dryRun" color="primary">
              <mat-icon>play_arrow</mat-icon> Create Merge Requests for Real
            </button>
            <button mat-stroked-button (click)="copyReport()" *ngIf="!form.dryRun">
              <mat-icon>content_copy</mat-icon> Copy Report
            </button>
            <button mat-stroked-button (click)="saveAsTemplate()">
              <mat-icon>bookmark</mat-icon> Save as Template
            </button>
            <button mat-raised-button color="primary" (click)="reset()">
              <mat-icon>refresh</mat-icon> Create Another
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; }
    .toggle-row { display: flex; align-items: center; }
    .event-list { margin-top: 16px; max-height: 500px; overflow-y: auto; }
    .event-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 4px; margin-bottom: 4px; background: #f5f5f5; }
    .event-item.done { background: #e8f5e9; }
    .event-item.error { background: #ffebee; }
    .event-item.warning { background: #fff3e0; }
    .event-item .mat-icon { font-size: 20px; height: 20px; width: 20px; }
    .event-item.done .mat-icon { color: #2e7d32; }
    .event-item.error .mat-icon { color: #c62828; }
    .event-item.warning .mat-icon { color: #e65100; }
    .event-message { flex: 1; font-size: 14px; }
    .event-branch { font-size: 12px; color: rgba(0,0,0,0.6); background: #e0e0e0; padding: 2px 8px; border-radius: 4px; }
    .event-pr { font-size: 12px; font-weight: 500; color: #1565c0; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; margin-left: 8px; vertical-align: middle; }
    .badge-dry { background: #fff3e0; color: #e65100; border: 1px solid #e65100; }
    .load-branches-row { display: flex; align-items: center; gap: 12px; }
    .branch-count { font-size: 13px; color: rgba(0,0,0,0.6); }
    .branch-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .chip { display: inline-block; padding: 4px 10px; border-radius: 16px; background: #e3f2fd; color: #1565c0; font-size: 12px; cursor: pointer; transition: background 0.2s; }
    .chip:hover { background: #bbdefb; }
    .mt-16 { margin-top: 16px; }
  `,
})
export class MergeRequestNewComponent {
  private api = inject(ApiService);
  private mrService = inject(MergeRequestService);
  private templatesService = inject(TemplatesService);
  private snackBar = inject(MatSnackBar);

  step = signal<'form' | 'progress'>('form');
  executing = signal(false);
  events = signal<ProgressEvent[]>([]);
  progressDone = signal(false);
  branchesText = '';
  webhookEventsText = '';
  loadedBranches = signal<any[]>([]);
  loadingBranches = signal(false);

  providers = computed(() => this.api.providers.value() ?? []);

  form = {
    providerId: '',
    project: '',
    repo: '',
    target: 'main',
    titlePrefix: 'Merge',
    description: '',
    autoMerge: false,
    strategy: 'merge',
    dryRun: false,
    webhookUrl: '',
    webhookEvents: [] as string[],
  };

  private sub: Subscription | null = null;

  get canExecute() {
    return computed(() => {
      const f = this.form;
      const branches = this.parseBranches();
      return !!(f.providerId && f.project && f.repo && f.target && branches.length > 0);
    });
  }

  private parseBranches(): string[] {
    return this.branchesText.split('\n').map(b => b.trim()).filter(b => b.length > 0);
  }

  execute() {
    const branches = this.parseBranches();
    if (branches.length === 0) {
      this.snackBar.open('Enter at least one branch', 'Close', { duration: 3000 });
      return;
    }

    this.executing.set(true);
    this.step.set('progress');
    this.events.set([]);
    this.progressDone.set(false);

    const webhookEvents = this.webhookEventsText.split(',').map(s => s.trim()).filter(s => s.length > 0);
    this.form.webhookEvents = webhookEvents;
    const body = { ...this.form, branches, webhookEvents: webhookEvents.length > 0 ? webhookEvents : undefined };

    this.mrService.create(body).subscribe({
      next: (res) => {
        this.executing.set(false);
        this.sub = this.mrService.watchProgress(res.sessionId).subscribe({
          next: (ev) => {
            this.events.update(e => [...e, ev]);
            if (ev.type === 'done') {
              this.progressDone.set(true);
            }
          },
          error: () => {
            this.events.update(e => [...e, { type: 'error', message: 'Progress connection lost', timestamp: '' }]);
            this.progressDone.set(true);
          },
          complete: () => this.progressDone.set(true),
        });
      },
      error: () => {
        this.executing.set(false);
        this.step.set('form');
      },
    });
  }

  loadBranches() {
    if (!this.form.providerId || !this.form.project || !this.form.repo) return;
    this.loadingBranches.set(true);
    this.api.getBranches(this.form.providerId, this.form.project, this.form.repo).subscribe({
      next: (branches) => {
        this.loadedBranches.set(branches);
        this.loadingBranches.set(false);
      },
      error: () => {
        this.loadingBranches.set(false);
        this.snackBar.open('Failed to load branches', 'Close', { duration: 3000 });
      },
    });
  }

  addBranch(name: string) {
    const current = this.parseBranches();
    if (current.includes(name)) return;
    const newText = this.branchesText ? this.branchesText.trim() + '\n' + name : name;
    this.branchesText = newText;
  }

  copyReport() {
    const text = this.events()
      .map(e => `[${e.type.toUpperCase()}] ${e.message}${e.branch ? ` (${e.branch})` : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Report copied to clipboard', 'Close', { duration: 2000 });
    }).catch(() => {
      this.snackBar.open('Failed to copy report', 'Close', { duration: 3000 });
    });
  }

  saveAsTemplate() {
    const branches = this.parseBranches();
    this.templatesService.create({
      name: `${this.form.project}/${this.form.repo} — ${this.form.target}`,
      providerId: this.form.providerId,
      project: this.form.project,
      repo: this.form.repo,
      target: this.form.target,
      branchesJson: JSON.stringify(branches),
      titlePrefix: this.form.titlePrefix,
      description: this.form.description,
      autoMerge: this.form.autoMerge,
      strategy: this.form.strategy,
    }).subscribe({
      next: () => this.snackBar.open('Template saved', 'Close', { duration: 2000 }),
      error: () => this.snackBar.open('Failed to save template', 'Close', { duration: 3000 }),
    });
  }

  switchToReal() {
    this.form.dryRun = false;
    this.step.set('form');
    this.events.set([]);
    this.progressDone.set(false);
  }

  reset() {
    this.sub?.unsubscribe();
    this.step.set('form');
    this.events.set([]);
    this.progressDone.set(false);
    this.form = { providerId: '', project: '', repo: '', target: 'main', titlePrefix: 'Merge', description: '', autoMerge: false, strategy: 'merge', dryRun: false, webhookUrl: '', webhookEvents: [] };
    this.branchesText = '';
    this.webhookEventsText = '';
    this.loadedBranches.set([]);
  }

  eventIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'circle';
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
