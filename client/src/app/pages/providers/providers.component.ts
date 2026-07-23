import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, ValidationErrors, AbstractControl } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { ProvidersService } from '../../core/services/providers.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ProviderCreate, RepoInfo } from '../../shared/models/provider.model';

function urlValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  try { new URL(control.value); return null; }
  catch { return { url: true }; }
}

@Component({
  selector: 'app-providers',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatAutocompleteModule,
    MatSnackBarModule, MatTooltipModule,
    TranslatePipe, EmptyStateComponent,
  ],
  template: `
    <div class="header">
      <h1 class="page-title mat-headline-4">{{ 'providers.title' | translate }}</h1>
      @if (!showForm()) {
        <button mat-raised-button color="primary" (click)="showForm.set(true)">
          <mat-icon>add</mat-icon> {{ 'providers.add' | translate }}
        </button>
      }
    </div>

    @if (showForm()) {
      <mat-card class="form-card">
        <mat-card-content>
          <h3>{{ editingId() ? ('providers.edit' | translate) : ('providers.new' | translate) }}</h3>
          <div class="form-grid">
            <mat-form-field appearance="fill">
              <mat-label>{{ 'providers.name' | translate }}</mat-label>
              <input matInput [value]="form().name" (input)="updateForm('name', $any($event).target.value)" placeholder="My Bitbucket">
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>{{ 'providers.type' | translate }}</mat-label>
              <mat-select [value]="form().type" (selectionChange)="updateForm('type', $event.value)">
                <mat-option value="bitbucket">Bitbucket</mat-option>
                <mat-option value="gitlab">GitLab</mat-option>
                <mat-option value="github">GitHub</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>{{ 'providers.apiUrl' | translate }}</mat-label>
              <input matInput [formControl]="urlControl" placeholder="https://bitbucket.example.com">
              @if (urlControl.invalid && urlControl.touched) {
                <mat-error>{{ 'providers.invalidUrl' | translate }}</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>{{ 'providers.token' | translate }}</mat-label>
              <input matInput type="password" [value]="form().token" (input)="updateForm('token', $any($event).target.value)">
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>{{ 'providers.defaultTarget' | translate }}</mat-label>
              <input matInput [value]="form().defaultTarget" (input)="updateForm('defaultTarget', $any($event).target.value)" placeholder="main">
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>{{ 'providers.defaultPrefix' | translate }}</mat-label>
              <input matInput [value]="form().defaultTitlePrefix" (input)="updateForm('defaultTitlePrefix', $any($event).target.value)" placeholder="Merge">
            </mat-form-field>
          </div>

          <div class="repo-section mt-16">
            <h4>{{ 'providers.repository' | translate }}</h4>
            <div class="repo-row">
              <button mat-stroked-button (click)="loadRepos()"
                [disabled]="!form().apiUrl || !form().token || loadingRepos()">
                <mat-icon>cloud_download</mat-icon>
                {{ loadingRepos() ? ('providers.loading' | translate) : ('providers.loadRepos' | translate) }}
              </button>
              @if (reposError()) {
                <span class="repo-error">{{ reposError() }}</span>
              }
            </div>
            @if (repos().length > 0) {
              <mat-form-field appearance="fill" class="full-width mt-16">
                <mat-label>{{ 'providers.selectRepo' | translate }}</mat-label>
                <input matInput [matAutocomplete]="repoAuto"
                  [value]="selectedRepoLabel()"
                  (input)="filterRepos($any($event).target.value)">
                <mat-autocomplete #repoAuto="matAutocomplete"
                  (optionSelected)="onRepoSelected($event.option.value)">
                  @for (r of filteredRepos(); track r.fullName) {
                    <mat-option [value]="r">
                      {{ r.fullName }}
                    </mat-option>
                  }
                </mat-autocomplete>
              </mat-form-field>
            }
            @if (form().defaultProject && form().defaultRepo) {
              <div class="selected-repo">
                <mat-icon>check_circle</mat-icon>
                {{ form().defaultProject }}/{{ form().defaultRepo }}
              </div>
            }
          </div>

          <div class="form-actions">
            <button mat-button (click)="cancelForm()">{{ 'providers.cancel' | translate }}</button>
            <button mat-raised-button color="primary" (click)="save()" [disabled]="saving()">
              {{ saving() ? ('providers.saving' | translate) : ('providers.save' | translate) }}
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    }

    <mat-card>
      <mat-card-content>
        @if (providers().length > 0) {
          <table mat-table [dataSource]="providers()" class="full-width">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>{{ 'providers.name' | translate }}</th>
              <td mat-cell *matCellDef="let p">{{ p.name }}</td>
            </ng-container>
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>{{ 'providers.type' | translate }}</th>
              <td mat-cell *matCellDef="let p">
                <span class="type-badge" [class.bitbucket]="p.type==='bitbucket'" [class.gitlab]="p.type==='gitlab'" [class.github]="p.type==='github'">{{ p.type }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="apiUrl">
              <th mat-header-cell *matHeaderCellDef>{{ 'providers.apiUrl' | translate }}</th>
              <td mat-cell *matCellDef="let p">{{ p.apiUrl }}</td>
            </ng-container>
            <ng-container matColumnDef="defaultTarget">
              <th mat-header-cell *matHeaderCellDef>{{ 'providers.target' | translate }}</th>
              <td mat-cell *matCellDef="let p">{{ p.defaultTarget || 'main' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let p" class="actions-cell">
                <button mat-icon-button (click)="testConnection(p)" matTooltip="{{ 'providers.test' | translate }}" [disabled]="testingId() === p.id">
                  <mat-icon>{{ testingId() === p.id ? 'hourglass_top' : 'wifi' }}</mat-icon>
                </button>
                <button mat-icon-button (click)="edit(p)" matTooltip="{{ 'providers.editAction' | translate }}">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="deleteProvider(p)" matTooltip="{{ 'providers.delete' | translate }}">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
        }

        @if (providers().length === 0) {
          <app-empty-state icon="cloud"
            [title]="'providers.none' | translate"
            [description]="'providers.addHint' | translate">
            <button mat-raised-button color="primary" (click)="showForm.set(true)">{{ 'providers.add' | translate }}</button>
          </app-empty-state>
        }

        @if (testResult()) {
          <div class="test-result" [class.success]="testResult()?.ok" [class.error]="!testResult()?.ok">
            <mat-icon>{{ testResult()?.ok ? 'check_circle' : 'error' }}</mat-icon>
            {{ testResult()?.message }}
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
    .form-card { margin-bottom: 20px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .actions-cell { white-space: nowrap; }
    .type-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; text-transform: uppercase; background: #e0e0e0; }
    .type-badge.bitbucket { background: #e3f2fd; color: #1565c0; }
    .type-badge.gitlab { background: #fff3e0; color: #e65100; }
    .type-badge.github { background: #e8f5e9; color: #2e7d32; }
    .test-result { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding: 12px; border-radius: 4px; }
    .test-result.success { background: #e8f5e9; color: #2e7d32; }
    .test-result.error { background: #ffebee; color: #c62828; }
    .repo-section { border-top: 1px solid #e0e0e0; padding-top: 16px; }
    .repo-section h4 { margin: 0 0 12px; font-weight: 500; }
    .repo-row { display: flex; align-items: center; gap: 12px; }
    .repo-error { color: #c62828; font-size: 13px; }
    .selected-repo { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 14px; color: #2e7d32; }
    .full-width { width: 100%; }
  `,
})
export class ProvidersComponent {
  private service = inject(ProvidersService);
  private snackBar = inject(MatSnackBar);

  providers = computed(() => this.service.providers.value() ?? []);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  saving = signal(false);
  testingId = signal<string | null>(null);
  testResult = signal<{ ok: boolean; message: string } | null>(null);

  repos = signal<RepoInfo[]>([]);
  filteredRepos = signal<RepoInfo[]>([]);
  loadingRepos = signal(false);
  reposError = signal<string | null>(null);
  repoFilter = signal('');

  selectedRepoLabel = computed(() => {
    const f = this.form();
    if (f.defaultProject && f.defaultRepo) return `${f.defaultProject}/${f.defaultRepo}`;
    return '';
  });

  columns = ['name', 'type', 'apiUrl', 'defaultTarget', 'actions'];

  form = signal<ProviderCreate>({ name: '', type: 'bitbucket', apiUrl: '', token: '', defaultTarget: 'main', defaultTitlePrefix: 'Merge' });
  urlControl = new FormControl('', { validators: [urlValidator], updateOn: 'blur' });
  private syncingUrl = false;

  protected updateForm(key: string, value: string) {
    if (key === 'apiUrl' && !this.syncingUrl) {
      this.syncingUrl = true;
      this.urlControl.setValue(value as string, { emitEvent: false });
      this.syncingUrl = false;
    }
    this.form.update(f => ({ ...f, [key]: value }));
  }

  constructor() {
    this.urlControl.valueChanges.subscribe(v => {
      if (this.syncingUrl) return;
      this.syncingUrl = true;
      this.form.update(f => ({ ...f, apiUrl: v ?? '' }));
      this.syncingUrl = false;
    });
  }

  loadRepos() {
    const f = this.form();
    if (!f.apiUrl || !f.token) return;

    this.loadingRepos.set(true);
    this.reposError.set(null);
    this.repos.set([]);

    this.service.exploreRepos(f.type, f.apiUrl, f.token).subscribe({
      next: (repos) => {
        this.repos.set(repos);
        this.filteredRepos.set(repos);
        this.loadingRepos.set(false);
      },
      error: () => {
        this.reposError.set('Failed to load repositories');
        this.loadingRepos.set(false);
      },
    });
  }

  filterRepos(value: string) {
    const filter = value?.toLowerCase() || '';
    this.repoFilter.set(filter);
    this.filteredRepos.set(
      this.repos().filter(r => r.fullName.toLowerCase().includes(filter))
    );
  }

  onRepoSelected(repo: RepoInfo) {
    this.form.update(f => ({ ...f, defaultProject: repo.project, defaultRepo: repo.name }));
  }

  cancelForm() {
    this.showForm.set(false);
    this.editingId.set(null);
    this.resetForm();
  }

  private resetForm() {
    this.form.set({ name: '', type: 'bitbucket', apiUrl: '', token: '', defaultTarget: 'main', defaultTitlePrefix: 'Merge' });
    this.syncingUrl = true;
    this.urlControl.reset('', { emitEvent: false });
    this.syncingUrl = false;
    this.repos.set([]);
    this.filteredRepos.set([]);
    this.reposError.set(null);
  }

  save() {
    const f = this.form();
    if (!f.name || !f.apiUrl || !f.token) {
      this.snackBar.open('Name, API URL, and Token are required', 'Close', { duration: 3000 });
      return;
    }
    this.saving.set(true);
    const op = this.editingId()
      ? this.service.update(this.editingId()!, f)
      : this.service.create(f);

    op.subscribe({
      next: () => {
        this.service.refresh();
        this.cancelForm();
        this.snackBar.open('Provider saved', 'Close', { duration: 2000 });
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  edit(p: any) {
    this.editingId.set(p.id);
    this.form.set({ ...p, token: '' });
    this.syncingUrl = true;
    this.urlControl.setValue(p.apiUrl || '', { emitEvent: false });
    this.urlControl.markAsTouched();
    this.syncingUrl = false;
    if (p.defaultProject && p.defaultRepo) {
      const repo: RepoInfo = { project: p.defaultProject, name: p.defaultRepo, fullName: `${p.defaultProject}/${p.defaultRepo}` };
      this.repos.set([repo]);
      this.filteredRepos.set([repo]);
    }
    this.showForm.set(true);
  }

  deleteProvider(p: any) {
    if (!confirm(`Delete provider "${p.name}"?`)) return;
    this.service.delete(p.id).subscribe(() => {
      this.service.refresh();
      this.snackBar.open('Provider deleted', 'Close', { duration: 2000 });
    });
  }

  testConnection(p: any) {
    this.testingId.set(p.id);
    this.testResult.set(null);
    this.service.test(p.id).subscribe({
      next: (res) => {
        this.testResult.set(res);
        this.testingId.set(null);
      },
      error: () => {
        this.testResult.set({ ok: false, message: 'Connection failed' });
        this.testingId.set(null);
      },
    });
  }
}
