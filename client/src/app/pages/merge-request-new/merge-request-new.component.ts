import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { MergeRequestService } from '../../core/services/merge-request.service';
import { TemplatesService } from '../../core/services/templates.service';
import { HistoryRecord } from '../../shared/models/history.model';
import { ProgressEvent } from '../../shared/models/merge-result.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-merge-request-new',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSlideToggleModule, MatProgressBarModule, MatSnackBarModule, MatExpansionModule,
    TranslatePipe,
  ],
  template: `
    <h1 class="page-title mat-headline-4">{{ 'mrNew.title' | translate }}</h1>

    @if (step() === 'form') {
      <div>
        <mat-card class="form-card">
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field appearance="fill">
                <mat-label>{{ 'mrNew.provider' | translate }}</mat-label>
                <mat-select [value]="form().providerId" (selectionChange)="updateForm('providerId', $event.value)">
                  @for (p of providers(); track p.id) {
                    <mat-option [value]="p.id">
                      {{ p.name }} ({{ p.type }})
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>{{ 'mrNew.project' | translate }}</mat-label>
                <input matInput [value]="form().project" (input)="updateForm('project', $any($event).target.value)" placeholder="MY_PROJECT">
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>{{ 'mrNew.repository' | translate }}</mat-label>
                <input matInput [value]="form().repo" (input)="updateForm('repo', $any($event).target.value)" placeholder="my-repo">
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>{{ 'mrNew.targetBranch' | translate }}</mat-label>
                <input matInput [value]="form().target" (input)="updateForm('target', $any($event).target.value)" placeholder="main">
              </mat-form-field>
            </div>

            <div class="load-branches-row mt-16">
              <button mat-stroked-button (click)="loadBranches()"
                [disabled]="!form().providerId || !form().project || !form().repo || loadingBranches()">
                <mat-icon>download</mat-icon>
                {{ loadingBranches() ? ('mrNew.loading' | translate) : ('mrNew.loadBranches' | translate) }}
              </button>
              @if (loadedBranches().length > 0) {
                <span class="branch-count">
                  {{ loadedBranches().length }} {{ 'mrNew.branchesLoaded' | translate }}
                </span>
              }
            </div>

            <mat-form-field appearance="fill" class="full-width mt-16">
              <mat-label>{{ 'mrNew.sourceBranches' | translate }}</mat-label>
              <textarea matInput rows="5" [value]="branchesText()" (input)="branchesText.set($any($event).target.value)" placeholder="feature/new-feature&#10;bugfix/issue-123&#10;hotfix/critical"></textarea>
            </mat-form-field>

            @if (loadedBranches().length > 0) {
              <div class="branch-chips">
                @for (b of loadedBranches(); track b.displayId) {
                  <span class="chip" (click)="addBranch(b.displayId)">
                    {{ b.displayId }}
                  </span>
                }
              </div>
            }

            <div class="form-grid mt-16">
              <mat-form-field appearance="fill">
                <mat-label>{{ 'mrNew.titlePrefix' | translate }}</mat-label>
                <input matInput [value]="form().titlePrefix" (input)="updateForm('titlePrefix', $any($event).target.value)" placeholder="Merge">
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>{{ 'mrNew.strategy' | translate }}</mat-label>
                <mat-select [value]="form().strategy" (selectionChange)="updateForm('strategy', $event.value)">
                  <mat-option value="merge">{{ 'mrNew.mergeCommit' | translate }}</mat-option>
                  <mat-option value="squash">{{ 'mrNew.squash' | translate }}</mat-option>
                  <mat-option value="fast-forward">{{ 'mrNew.fastForward' | translate }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <mat-form-field appearance="fill" class="full-width mt-16">
              <mat-label>{{ 'mrNew.description' | translate }}</mat-label>
              <textarea matInput rows="3" [value]="form().description" (input)="updateForm('description', $any($event).target.value)" placeholder="Auto-created merge request"></textarea>
            </mat-form-field>

            <div class="toggle-row mt-16">
              <mat-slide-toggle [checked]="form().autoMerge" (change)="updateForm('autoMerge', $event.checked)">{{ 'mrNew.autoMerge' | translate }}</mat-slide-toggle>
            </div>

            <div class="toggle-row mt-16">
              <mat-slide-toggle [checked]="form().dryRun" (change)="updateForm('dryRun', $event.checked)">{{ 'mrNew.dryRun' | translate }}</mat-slide-toggle>
            </div>

            <mat-accordion class="mt-16">
              <mat-expansion-panel>
                <mat-expansion-panel-header>
                  <mat-panel-title>{{ 'mrNew.webhook' | translate }}</mat-panel-title>
                  <mat-panel-description>{{ 'mrNew.registerWebhook' | translate }}</mat-panel-description>
                </mat-expansion-panel-header>
                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>{{ 'mrNew.webhookUrl' | translate }}</mat-label>
                  <input matInput [value]="form().webhookUrl" (input)="updateForm('webhookUrl', $any($event).target.value)" placeholder="https://hooks.example.com/webhook">
                </mat-form-field>
                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>{{ 'mrNew.events' | translate }}</mat-label>
                  <input matInput [value]="webhookEventsText()" (input)="webhookEventsText.set($any($event).target.value)" placeholder="pr:merged, pr:updated">
                  <mat-hint>{{ 'mrNew.eventTypes' | translate }}</mat-hint>
                </mat-form-field>
              </mat-expansion-panel>
            </mat-accordion>

            <div class="form-actions mt-16">
              <button mat-raised-button [color]="form().dryRun ? 'accent' : 'primary'" (click)="execute()"
                [disabled]="!canExecute() || executing()" size="large">
                <mat-icon>{{ form().dryRun ? 'science' : 'play_arrow' }}</mat-icon>
                {{ executing() ? (form().dryRun ? ('mrNew.validating' | translate) : ('mrNew.creating' | translate)) : (form().dryRun ? ('mrNew.runDryRun' | translate) : ('mrNew.create' | translate)) }}
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    }

    @if (step() === 'progress') {
      <div>
        <mat-card>
          <mat-card-content>
            <h3>
              @if (form().dryRun) {
                {{ 'mrNew.validationTitle' | translate }}
              } @else {
                {{ 'mrNew.creatingTitle' | translate }}
              }
              @if (form().dryRun) {
                <span class="badge badge-dry">DRY RUN</span>
              }
            </h3>
            @if (!progressDone()) {
              <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            }

            <div class="event-list">
              @for (ev of events(); track $index) {
                <div class="event-item" [class.done]="ev.type === 'success'"
                     [class.error]="ev.type === 'error'" [class.warning]="ev.type === 'warning'">
                  <mat-icon>{{ eventIcon(ev.type) }}</mat-icon>
                  <span class="event-message">{{ ev.message }}</span>
                  @if (ev.branch) {
                    <span class="event-branch">{{ ev.branch }}</span>
                  }
                  @if (ev.prId) {
                    <span class="event-pr">#{{ ev.prId }}</span>
                  }
                </div>
              }
            </div>

            @if (progressDone()) {
              <div class="form-actions mt-16">
                @if (form().dryRun) {
                  <button mat-raised-button (click)="switchToReal()" color="primary">
                    <mat-icon>play_arrow</mat-icon> {{ 'mrNew.createReal' | translate }}
                  </button>
                }
                @if (!form().dryRun) {
                  <button mat-stroked-button (click)="copyReport()">
                    <mat-icon>content_copy</mat-icon> {{ 'mrNew.copyReport' | translate }}
                  </button>
                }
                <button mat-stroked-button (click)="saveAsTemplate()">
                  <mat-icon>bookmark</mat-icon> {{ 'mrNew.saveTemplate' | translate }}
                </button>
                <button mat-raised-button color="primary" (click)="reset()">
                  <mat-icon>refresh</mat-icon> {{ 'mrNew.createAnother' | translate }}
                </button>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </div>
    }
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
  private router = inject(Router);

  step = signal<'form' | 'progress'>('form');
  executing = signal(false);
  events = signal<ProgressEvent[]>([]);
  progressDone = signal(false);
  branchesText = signal('');
  webhookEventsText = signal('');
  loadedBranches = signal<any[]>([]);
  loadingBranches = signal(false);

  providers = computed(() => this.api.providers.value() ?? []);

  constructor() {
    const nav = this.router.getCurrentNavigation();
    const config = (nav?.extras?.state as any)?.['config'] as HistoryRecord | undefined;
    if (config) {
      this.updateForm('providerId', config.providerId || '');
      this.updateForm('project', config.project || '');
      this.updateForm('repo', config.repo || '');
      this.updateForm('target', config.target || 'main');
      this.updateForm('titlePrefix', (config as any).titlePrefix || 'Merge');
      this.updateForm('description', (config as any).description || '');
      this.updateForm('autoMerge', config.autoMerge || false);
      this.updateForm('strategy', config.strategy || 'merge');
      if (config.resultsJson) {
        try {
          const branches = JSON.parse(config.resultsJson);
          if (Array.isArray(branches)) {
            this.branchesText.set(branches.join('\n'));
          }
        } catch { }
      }
      setTimeout(() =>
        this.snackBar.open('Configuration loaded from history', 'Close', { duration: 3000 })
      );
    }
  }

  form = signal({
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
  });

  protected updateForm(key: string, value: string | boolean | string[]) {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  private sub: Subscription | null = null;

  get canExecute() {
    return computed(() => {
      const f = this.form();
      const branches = this.parseBranches();
      return !!(f.providerId && f.project && f.repo && f.target && branches.length > 0);
    });
  }

  private parseBranches(): string[] {
    return this.branchesText().split('\n').map(b => b.trim()).filter(b => b.length > 0);
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

    const f = this.form();
    const webhookEvents = this.webhookEventsText().split(',').map(s => s.trim()).filter(s => s.length > 0);
    this.updateForm('webhookEvents', webhookEvents);
    const body = { ...f, branches, webhookEvents: webhookEvents.length > 0 ? webhookEvents : undefined };

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
    const f = this.form();
    if (!f.providerId || !f.project || !f.repo) return;
    this.loadingBranches.set(true);
    this.api.getBranches(f.providerId, f.project, f.repo).subscribe({
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
    const currentText = this.branchesText();
    const newText = currentText ? currentText.trim() + '\n' + name : name;
    this.branchesText.set(newText);
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
    const f = this.form();
    const branches = this.parseBranches();
    this.templatesService.create({
      name: `${f.project}/${f.repo} — ${f.target}`,
      providerId: f.providerId,
      project: f.project,
      repo: f.repo,
      target: f.target,
      branchesJson: JSON.stringify(branches),
      titlePrefix: f.titlePrefix,
      description: f.description,
      autoMerge: f.autoMerge,
      strategy: f.strategy,
    }).subscribe({
      next: () => this.snackBar.open('Template saved', 'Close', { duration: 2000 }),
      error: () => this.snackBar.open('Failed to save template', 'Close', { duration: 3000 }),
    });
  }

  switchToReal() {
    this.updateForm('dryRun', false);
    this.step.set('form');
    this.events.set([]);
    this.progressDone.set(false);
  }

  reset() {
    this.sub?.unsubscribe();
    this.step.set('form');
    this.events.set([]);
    this.progressDone.set(false);
    this.form.set({ providerId: '', project: '', repo: '', target: 'main', titlePrefix: 'Merge', description: '', autoMerge: false, strategy: 'merge', dryRun: false, webhookUrl: '', webhookEvents: [] });
    this.branchesText.set('');
    this.webhookEventsText.set('');
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
