import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressBarModule,
    TranslatePipe,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-content>
          <h2>{{ 'auth.login.title' | translate }}</h2>
          <p class="subtitle">{{ 'auth.login.subtitle' | translate }}</p>

          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>{{ 'auth.login.email' | translate }}</mat-label>
            <input matInput type="email" [(ngModel)]="email" placeholder="user@example.com" (keydown.enter)="login()">
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>{{ 'auth.login.password' | translate }}</mat-label>
            <input matInput type="password" [(ngModel)]="password" placeholder="••••••••" (keydown.enter)="login()">
          </mat-form-field>

          @if (loading()) {
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          }

          <button mat-raised-button color="primary" class="full-width mt-16" (click)="login()" [disabled]="loading()">
            {{ 'auth.login.signIn' | translate }}
          </button>

          <p class="mt-16 register-link">
            {{ 'auth.login.noAccount' | translate }}
            <a routerLink="/register" class="link">{{ 'auth.login.createOne' | translate }}</a>
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .login-container { display: flex; justify-content: center; align-items: center; min-height: 60vh; }
    .login-card { max-width: 400px; width: 100%; padding: 32px; }
    .login-card h2 { text-align: center; margin-bottom: 4px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 24px; font-size: 14px; }
    .full-width { width: 100%; }
    .error-banner { background: #ffebee; color: #c62828; padding: 12px; border-radius: 4px; margin-bottom: 16px; font-size: 13px; }
    .register-link { text-align: center; font-size: 13px; color: #666; }
    .link { color: #3f51b5; cursor: pointer; text-decoration: none; }
    .link:hover { text-decoration: underline; }
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  login() {
    if (!this.email || !this.password) {
      this.error.set('Email and password are required');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Login failed');
      },
    });
  }
}
