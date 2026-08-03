import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { form, required, FormField } from '@angular/forms/signals';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { MergeRequestService } from '../../core/services/merge-request.service';
import { TemplatesService } from '../../core/services/templates.service';
import { HistoryRecord } from '../../shared/models/history.model';
import { Template } from '../../shared/models/template.model';
import { ProgressEvent } from '../../shared/models/merge-result.model';
import { Subscription } from 'rxjs';

interface MrFormData {
  providerId: string;
  project: string;
  repo: string;
  target: string;
  titlePrefix: string;
  description: string;
  autoMerge: boolean;
  strategy: string;
  dryRun: boolean;
  webhookUrl: string;
  webhookEvents: string[];
}

@Component({
  selector: 'app-merge-request-new',
  standalone: true,
  imports: [
    CommonModule, FormField,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSlideToggleModule, MatProgressBarModule, MatSnackBarModule, MatExpansionModule, MatTooltipModule,
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
                <mat-select [formField]="mrForm.providerId" (selectionChange)="onProviderChange()">
                  @for (p of providers(); track p.id) {
                    <mat-option [value]="p.id">
                      {{ p.name }} ({{ p.type }})
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>{{ 'mrNew.project' | translate }}</mat-label>
                <input matInput [formField]="mrForm.project" placeholder="MY_PROJECT">
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>{{ 'mrNew.repository' | translate }}</mat-label>
                <input matInput [formField]="mrForm.repo" placeholder="my-repo">
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>{{ 'mrNew.targetBranch' | translate }}</mat-label>
                <input matInput [formField]="mrForm.target" placeholder="main">
              </mat-form-field>
            </div>

            <div class="load-branches-row mt-16">
              <button mat-stroked-button (click)="loadBranches()"
                [disabled]="!mrModel().providerId || !mrModel().project || !mrModel().repo || loadingBranches()">
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
                <input matInput [formField]="mrForm.titlePrefix" placeholder="Merge">
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>{{ 'mrNew.strategy' | translate }}</mat-label>
                <mat-select [formField]="mrForm.strategy">
                  <mat-option value="merge">{{ 'mrNew.mergeCommit' | translate }}</mat-option>
                  <mat-option value="squash">{{ 'mrNew.squash' | translate }}</mat-option>
                  <mat-option value="fast-forward">{{ 'mrNew.fastForward' | translate }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <mat-form-field appearance="fill" class="full-width mt-16">
              <mat-label>{{ 'mrNew.description' | translate }}</mat-label>
              <textarea matInput rows="3" [formField]="mrForm.description" placeholder="Auto-created merge request"></textarea>
            </mat-form-field>

            <div class="toggle-row mt-16">
              <mat-slide-toggle [formField]="mrForm.autoMerge">{{ 'mrNew.autoMerge' | translate }}</mat-slide-toggle>
            </div>

            <div class="toggle-row mt-16">
              <mat-slide-toggle [formField]="mrForm.dryRun">{{ 'mrNew.dryRun' | translate }}</mat-slide-toggle>
            </div>

            <mat-accordion class="mt-16">
              <mat-expansion-panel [disabled]="!canUseWebhooks()">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    {{ 'mrNew.webhook' | translate }}
                    @if (!canUseWebhooks()) {
                      <mat-icon class="lock-badge">lock</mat-icon>
                    }
                  </mat-panel-title>
                  <mat-panel-description matTooltip="{{ !canUseWebhooks() ? ('plan.locked.webhooks' | translate) : '' }}">
                    {{ 'mrNew.registerWebhook' | translate }}
                  </mat-panel-description>
                </mat-expansion-panel-header>
                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>{{ 'mrNew.webhookUrl' | translate }}</mat-label>
                  <input matInput [formField]="mrForm.webhookUrl" placeholder="https://hooks.example.com/webhook">
                </mat-form-field>
                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>{{ 'mrNew.events' | translate }}</mat-label>
                  <input matInput [value]="webhookEventsText()" (input)="webhookEventsText.set($any($event).target.value)" placeholder="pr:merged, pr:updated">
                  <mat-hint>{{ 'mrNew.eventTypes' | translate }}</mat-hint>
                </mat-form-field>
              </mat-expansion-panel>
            </mat-accordion>

            <div class="form-actions mt-16">
              <button mat-raised-button [color]="mrModel().dryRun ? 'accent' : 'primary'" (click)="execute()"
                [disabled]="!canExecute() || executing()" size="large">
                <mat-icon>{{ mrModel().dryRun ? 'science' : 'play_arrow' }}</mat-icon>
                {{ executing() ? (mrModel().dryRun ? ('mrNew.validating' | translate) : ('mrNew.creating' | translate)) : (mrModel().dryRun ? ('mrNew.runDryRun' | translate) : ('mrNew.create' | translate)) }}
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
              @if (mrModel().dryRun) {
                {{ 'mrNew.validationTitle' | translate }}
              } @else {
                {{ 'mrNew.creatingTitle' | translate }}
              }
              @if (mrModel().dryRun) {
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
                @if (mrModel().dryRun) {
                  <button mat-raised-button (click)="switchToReal()" color="primary">
                    <mat-icon>play_arrow</mat-icon> {{ 'mrNew.createReal' | translate }}
                  </button>
                }
                @if (!mrModel().dryRun) {
                  <button mat-stroked-button (click)="copyReport()">
                    <mat-icon>content_copy</mat-icon> {{ 'mrNew.copyReport' | translate }}
                  </button>
                }
                <button mat-stroked-button (click)="saveAsTemplate()" [disabled]="!canUseTemplates()"
                  matTooltip="{{ canUseTemplates() ? '' : ('plan.locked.templates' | translate) }}">
                  <mat-icon>{{ canUseTemplates() ? 'bookmark' : 'lock' }}</mat-icon> {{ 'mrNew.saveTemplate' | translate }}
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
    .lock-badge { font-size: 16px; height: 16px; width: 16px; margin-left: 6px; color: rgba(0,0,0,0.45); vertical-align: middle; }
  `,
})
export class MergeRequestNewComponent {
  private api = inject(ApiService);
  private mrService = inject(MergeRequestService);
  private templatesService = inject(TemplatesService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  canUseTemplates = computed(() => this.auth.canUseFeature('templates'));
  canUseWebhooks = computed(() => this.auth.canUseFeature('webhooks'));

  step = signal<'form' | 'progress'>('form');
  executing = signal(false);
  events = signal<ProgressEvent[]>([]);
  progressDone = signal(false);
  branchesText = signal('');
  webhookEventsText = signal('');
  loadedBranches = signal<any[]>([]);
  loadingBranches = signal(false);

  providers = computed(() => this.api.providers.value() ?? []);

  private defaults: MrFormData = {
    providerId: '', project: '', repo: '', target: 'main',
    titlePrefix: 'Merge', description: '', autoMerge: false,
    strategy: 'merge', dryRun: false, webhookUrl: '', webhookEvents: [],
  };

  mrModel = signal<MrFormData>({ ...this.defaults });

  mrForm = form(this.mrModel, (s) => {
    required(s.providerId, { message: 'Provider is required' });
    required(s.project, { message: 'Project is required' });
    required(s.repo, { message: 'Repository is required' });
  });

  canExecute = computed(() => {
    const f = this.mrModel();
    const branches = this.parseBranches();
    return !!(f.providerId && f.project && f.repo && f.target && branches.length > 0);
  });

  constructor() {
    const nav = this.router.getCurrentNavigation();
    const config = (nav?.extras?.state as any)?.['config'] as HistoryRecord | undefined;
    if (config) {
      this.mrModel.update(f => ({
        ...f,
        providerId: config.providerId || '',
        project: config.project || '',
        repo: config.repo || '',
        target: config.target || 'main',
        titlePrefix: (config as any).titlePrefix || 'Merge',
        description: (config as any).description || '',
        autoMerge: config.autoMerge || false,
        strategy: config.strategy || 'merge',
      }));
      if (config.resultsJson) {
        try {
          const parsed = JSON.parse(config.resultsJson);
          if (Array.isArray(parsed)) {
            const branches = parsed.length > 0 && typeof parsed[0] === 'object'
              ? (parsed as Array<{ branch: string }>).map(b => b.branch)
              : parsed as string[];
            this.branchesText.set(branches.join('\n'));
          }
        } catch { }
      }
      setTimeout(() =>
        this.snackBar.open('Configuration loaded from history', 'Close', { duration: 3000 })
      );
    } else {
      const templateId = this.route.snapshot.queryParamMap.get('template');
      if (templateId) {
        this.templatesService.get(templateId).subscribe({
          next: (t) => this.applyTemplate(t),
          error: () => this.snackBar.open('Failed to load template', 'Close', { duration: 3000 }),
        });
      }
    }
  }

  private applyTemplate(t: Template) {
    this.mrModel.update(f => ({
      ...f,
      providerId: t.providerId || '',
      project: t.project || '',
      repo: t.repo || '',
      target: t.target || 'main',
      titlePrefix: t.titlePrefix || 'Merge',
      description: t.description || '',
      autoMerge: t.autoMerge ?? false,
      strategy: t.strategy || 'merge',
    }));
    if (t.branchesJson) {
      try {
        const parsed = JSON.parse(t.branchesJson);
        if (Array.isArray(parsed)) {
          this.branchesText.set(parsed.join('\n'));
        }
      } catch { }
    }
    this.snackBar.open(`Template "${t.name}" loaded`, 'Close', { duration: 3000 });
  }

  protected onProviderChange() {
    const providerId = this.mrModel().providerId;
    const provider = this.providers().find(p => p.id === providerId);
    if (provider) {
      this.mrModel.update(f => ({
        ...f,
        project: provider.defaultProject || f.project,
        repo: provider.defaultRepo || f.repo,
      }));
    }
  }

  private sub: Subscription | null = null;

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

    const f = this.mrModel();
    const webhookEvents = this.webhookEventsText().split(',').map(s => s.trim()).filter(s => s.length > 0);
    this.mrModel.update(m => ({ ...m, webhookEvents }));
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
    const f = this.mrModel();
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
    const f = this.mrModel();
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
    this.mrModel.update(f => ({ ...f, dryRun: false }));
    this.step.set('form');
    this.events.set([]);
    this.progressDone.set(false);
  }

  reset() {
    this.sub?.unsubscribe();
    this.step.set('form');
    this.events.set([]);
    this.progressDone.set(false);
    this.mrModel.set({ ...this.defaults });
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
