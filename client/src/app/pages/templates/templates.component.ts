import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TemplatesService } from '../../core/services/templates.service';
import { ApiService } from '../../core/services/api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { Template } from '../../shared/models/template.model';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSlideToggleModule, MatSnackBarModule, MatTooltipModule,
    EmptyStateComponent,
  ],
  template: `
    <div class="header">
      <h1 class="page-title mat-headline-4">Templates</h1>
      <button mat-raised-button color="primary" (click)="openCreate()" *ngIf="!showForm()">
        <mat-icon>add</mat-icon> New Template
      </button>
    </div>

    <mat-card *ngIf="showForm()" class="form-card">
      <mat-card-content>
        <h3>{{ editingId() ? 'Edit Template' : 'New Template' }}</h3>
        <div class="form-grid">
          <mat-form-field appearance="fill">
            <mat-label>Name</mat-label>
            <input matInput [(ngModel)]="form.name" placeholder="Deploy to staging">
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>Provider</mat-label>
            <mat-select [(ngModel)]="form.providerId">
              <mat-option value="">Any</mat-option>
              <mat-option *ngFor="let p of providers()" [value]="p.id">{{ p.name }}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>Project</mat-label>
            <input matInput [(ngModel)]="form.project">
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>Repository</mat-label>
            <input matInput [(ngModel)]="form.repo">
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>Target Branch</mat-label>
            <input matInput [(ngModel)]="form.target" placeholder="main">
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>Branches (one per line)</mat-label>
            <textarea matInput rows="3" [(ngModel)]="formBranches" placeholder="feature/*&#10;bugfix/*"></textarea>
          </mat-form-field>
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
        <mat-slide-toggle [(ngModel)]="form.autoMerge" class="mt-16">Auto-merge</mat-slide-toggle>
        <div class="form-actions mt-16">
          <button mat-button (click)="cancelForm()">Cancel</button>
          <button mat-raised-button color="primary" (click)="save()" [disabled]="!form.name || !form.target">
            {{ editingId() ? 'Update' : 'Create' }}
          </button>
        </div>
      </mat-card-content>
    </mat-card>

    <div *ngIf="!showForm()" class="cards-grid">
      <mat-card class="template-card" *ngFor="let t of templates()">
        <mat-card-header>
          <mat-card-title>{{ t.name }}</mat-card-title>
          <mat-card-subtitle>{{ t.target }} · {{ branchCount(t) }} branches</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="template-meta">
            <span *ngIf="t.providerId" class="meta-chip">Provider: {{ providerName(t.providerId) }}</span>
            <span *ngIf="t.project" class="meta-chip">{{ t.project }}/{{ t.repo }}</span>
            <span class="meta-chip">{{ t.strategy }}</span>
            <span class="meta-chip" *ngIf="t.autoMerge">Auto-merge</span>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" routerLink="/merge-request/new" [queryParams]="{template: t.id}" matTooltip="Use this template">
            <mat-icon>play_arrow</mat-icon> Use
          </button>
          <button mat-stroked-button (click)="exportTemplate(t)" matTooltip="Export as JSON">
            <mat-icon>download</mat-icon>
          </button>
          <button mat-stroked-button (click)="editTemplate(t)" matTooltip="Edit">
            <mat-icon>edit</mat-icon>
          </button>
          <button mat-stroked-button color="warn" (click)="deleteTemplate(t)" matTooltip="Delete">
            <mat-icon>delete</mat-icon>
          </button>
        </mat-card-actions>
      </mat-card>
    </div>

    <app-empty-state *ngIf="!showForm() && templates().length === 0" icon="description"
      title="No templates yet"
      description="Create reusable templates for frequently used merge request configurations." />

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
  formBranches = '';

  form: Partial<Template> = {
    name: '', providerId: '', project: '', repo: '', target: 'main',
    branchesJson: '', titlePrefix: 'Merge', description: '',
    autoMerge: false, strategy: 'merge',
  };

  openCreate() {
    this.editingId.set(null);
    this.form = { name: '', providerId: '', project: '', repo: '', target: 'main', branchesJson: '', titlePrefix: 'Merge', description: '', autoMerge: false, strategy: 'merge' };
    this.formBranches = '';
    this.showForm.set(true);
  }

  cancelForm() {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  save() {
    const data: Partial<Template> = {
      ...this.form,
      branchesJson: this.formBranches ? JSON.stringify(this.formBranches.split('\n').map(b => b.trim()).filter(Boolean)) : undefined,
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
    this.form = { ...t };
    this.formBranches = t.branchesJson ? JSON.parse(t.branchesJson).join('\n') : '';
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
