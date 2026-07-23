import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { form, required, FormField } from '@angular/forms/signals';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { TemplatesService } from '../../core/services/templates.service';
import { ApiService } from '../../core/services/api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { Template } from '../../shared/models/template.model';

interface TemplateFormData {
  name: string;
  providerId: string;
  project: string;
  repo: string;
  target: string;
  branchesJson: string;
  titlePrefix: string;
  description: string;
  autoMerge: boolean;
  strategy: string;
}

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormField,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSlideToggleModule, MatSnackBarModule, MatTooltipModule,
    TranslatePipe, EmptyStateComponent,
  ],
  template: `
    <div class="header">
      <h1 class="page-title mat-headline-4">{{ 'templates.title' | translate }}</h1>
      @if (!showForm()) {
        <button mat-raised-button color="primary" (click)="openCreate()">
          <mat-icon>add</mat-icon> {{ 'templates.new' | translate }}
        </button>
      }
    </div>

    @if (showForm()) {
      <mat-card class="form-card">
        <mat-card-content>
          <h3>{{ editingId() ? ('templates.edit' | translate) : ('templates.new' | translate) }}</h3>
          <div class="form-grid">
            <mat-form-field appearance="fill">
              <mat-label>{{ 'templates.name' | translate }}</mat-label>
              <input matInput [formField]="templateForm.name" placeholder="Deploy to staging">
              @if (templateForm.name().touched() && templateForm.name().invalid()) {
                @for (err of templateForm.name().errors(); track err.kind) {
                  <mat-error>{{ err.message }}</mat-error>
                }
              }
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>{{ 'templates.provider' | translate }}</mat-label>
              <mat-select [formField]="templateForm.providerId">
                <mat-option value="">{{ 'templates.any' | translate }}</mat-option>
                @for (p of providers(); track p.id) {
                  <mat-option [value]="p.id">{{ p.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>{{ 'templates.project' | translate }}</mat-label>
              <input matInput [formField]="templateForm.project">
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>{{ 'templates.repository' | translate }}</mat-label>
              <input matInput [formField]="templateForm.repo">
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>{{ 'templates.targetBranch' | translate }}</mat-label>
              <input matInput [formField]="templateForm.target" placeholder="main">
              @if (templateForm.target().touched() && templateForm.target().invalid()) {
                @for (err of templateForm.target().errors(); track err.kind) {
                  <mat-error>{{ err.message }}</mat-error>
                }
              }
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>{{ 'templates.branches' | translate }}</mat-label>
              <textarea matInput rows="3" [value]="formBranches()" (input)="formBranches.set($any($event).target.value)" placeholder="feature/*&#10;bugfix/*"></textarea>
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>{{ 'templates.titlePrefix' | translate }}</mat-label>
              <input matInput [formField]="templateForm.titlePrefix" placeholder="Merge">
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>{{ 'templates.strategy' | translate }}</mat-label>
              <mat-select [formField]="templateForm.strategy">
                <mat-option value="merge">{{ 'templates.mergeCommit' | translate }}</mat-option>
                <mat-option value="squash">{{ 'templates.squash' | translate }}</mat-option>
                <mat-option value="fast-forward">{{ 'templates.fastForward' | translate }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <mat-slide-toggle [formField]="templateForm.autoMerge" class="mt-16">{{ 'templates.autoMerge' | translate }}</mat-slide-toggle>
          <div class="form-actions mt-16">
            <button mat-button (click)="cancelForm()">{{ 'templates.cancel' | translate }}</button>
            <button mat-raised-button color="primary" (click)="save()" [disabled]="!templateModel().name || !templateModel().target">
              {{ editingId() ? ('templates.update' | translate) : ('templates.create' | translate) }}
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    }

    @if (!showForm()) {
      <div class="cards-grid">
        @for (t of templates(); track t.id) {
          <mat-card class="template-card">
            <mat-card-header>
              <mat-card-title>{{ t.name }}</mat-card-title>
              <mat-card-subtitle>{{ t.target }} · {{ branchCount(t) }} {{ 'templates.count' | translate }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="template-meta">
                @if (t.providerId) {
                  <span class="meta-chip">{{ 'templates.provider' | translate }}: {{ providerName(t.providerId) }}</span>
                }
                @if (t.project) {
                  <span class="meta-chip">{{ t.project }}/{{ t.repo }}</span>
                }
                <span class="meta-chip">{{ t.strategy }}</span>
                @if (t.autoMerge) {
                  <span class="meta-chip">{{ 'templates.autoMerge' | translate }}</span>
                }
              </div>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary" routerLink="/merge-request/new" [queryParams]="{template: t.id}" matTooltip="{{ 'templates.use' | translate }}">
                <mat-icon>play_arrow</mat-icon> {{ 'templates.use' | translate }}
              </button>
              <button mat-stroked-button (click)="exportTemplate(t)" matTooltip="{{ 'templates.exportJson' | translate }}">
                <mat-icon>download</mat-icon>
              </button>
              <button mat-stroked-button (click)="editTemplate(t)" matTooltip="{{ 'providers.editAction' | translate }}">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-stroked-button color="warn" (click)="deleteTemplate(t)" matTooltip="{{ 'providers.delete' | translate }}">
                <mat-icon>delete</mat-icon>
              </button>
            </mat-card-actions>
          </mat-card>
        }
      </div>
    }

    @if (!showForm() && templates().length === 0) {
      <app-empty-state icon="description"
        [title]="'templates.none' | translate"
        [description]="'templates.noneHint' | translate" />
    }

    <input type="file" #fileInput accept=".json,.yaml,.yml" (change)="importTemplate($event)" style="display:none">
  `,
  styles: `
    .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
    .form-card { margin-bottom: 20px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .template-card { transition: transform 0.2s, box-shadow 0.2s; }
    .template-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
    .template-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .meta-chip { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #f0f0f0; font-size: 12px; color: rgba(0,0,0,0.7); }
    mat-card-actions { display: flex; gap: 8px; padding: 8px 16px !important; }
    .mt-16 { margin-top: 16px; }
  `,
})
export class TemplatesComponent {
  private api = inject(ApiService);
  private templatesService = inject(TemplatesService);
  private snackBar = inject(MatSnackBar);

  templates = computed(() => this.templatesService.templates.value() ?? []);
  providers = computed(() => this.api.providers.value() ?? []);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  formBranches = signal('');

  templateModel = signal<TemplateFormData>({
    name: '', providerId: '', project: '', repo: '', target: 'main',
    branchesJson: '', titlePrefix: 'Merge', description: '',
    autoMerge: false, strategy: 'merge',
  });

  templateForm = form(this.templateModel, (s) => {
    required(s.name, { message: 'Name is required' });
    required(s.target, { message: 'Target branch is required' });
  });

  private defaults: TemplateFormData = {
    name: '', providerId: '', project: '', repo: '', target: 'main',
    branchesJson: '', titlePrefix: 'Merge', description: '',
    autoMerge: false, strategy: 'merge',
  };

  openCreate() {
    this.editingId.set(null);
    this.templateModel.set({ ...this.defaults });
    this.formBranches.set('');
    this.showForm.set(true);
  }

  cancelForm() {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  save() {
    const f = this.templateModel();
    const fb = this.formBranches();
    const data: Record<string, any> = {
      ...f,
      branchesJson: fb ? JSON.stringify(fb.split('\n').map(b => b.trim()).filter(Boolean)) : undefined,
    };

    const op = this.editingId()
      ? this.templatesService.update(this.editingId()!, data)
      : this.templatesService.create(data);

    op.subscribe({
      next: () => {
        this.templatesService.refresh();
        this.cancelForm();
        this.snackBar.open('Template saved', 'Close', { duration: 2000 });
      },
    });
  }

  editTemplate(t: Template) {
    this.editingId.set(t.id);
    this.templateModel.set({
      name: t.name || '',
      providerId: t.providerId || '',
      project: t.project || '',
      repo: t.repo || '',
      target: t.target || 'main',
      branchesJson: t.branchesJson || '',
      titlePrefix: t.titlePrefix || 'Merge',
      description: t.description || '',
      autoMerge: t.autoMerge ?? false,
      strategy: t.strategy || 'merge',
    });
    this.formBranches.set(t.branchesJson ? JSON.parse(t.branchesJson).join('\n') : '');
    this.showForm.set(true);
  }

  deleteTemplate(t: Template) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    this.templatesService.delete(t.id).subscribe(() => {
      this.templatesService.refresh();
      this.snackBar.open('Template deleted', 'Close', { duration: 2000 });
    });
  }

  exportTemplate(t: Template) {
    const blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importTemplate(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        this.templatesService.create(data).subscribe(() => {
          this.templatesService.refresh();
          this.snackBar.open('Template imported', 'Close', { duration: 2000 });
        });
      } catch {
        this.snackBar.open('Invalid JSON file', 'Close', { duration: 3000 });
      }
    };
    reader.readAsText(file);
  }

  branchCount(t: Template): number {
    if (!t.branchesJson) return 0;
    try { return JSON.parse(t.branchesJson).length; } catch { return 0; }
  }

  providerName(id: string | undefined): string {
    if (!id) return 'Any';
    return this.providers().find(p => p.id === id)?.name || id;
  }
}
