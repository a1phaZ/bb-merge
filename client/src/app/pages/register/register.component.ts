import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatProgressBarModule,
  ],
  template: `
    <div class="register-container">
      <mat-card class="register-card">
        <mat-card-content>
          <h2>Create Account</h2>
          <p class="subtitle">Start with a free plan — 3 MRs per month</p>

          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Display Name</mat-label>
            <input matInput [(ngModel)]="displayName" placeholder="John Doe" (keydown.enter)="register()">
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput type="email" [(ngModel)]="email" placeholder="user@example.com" (keydown.enter)="register()">
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Password</mat-label>
            <input matInput type="password" [(ngModel)]="password" placeholder="At least 6 characters" (keydown.enter)="register()">
          </mat-form-field>

          @if (loading()) {
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          }

          <button mat-raised-button color="primary" class="full-width mt-16" (click)="register()" [disabled]="loading()">
            Create Free Account
          </button>

          <p class="mt-16 login-link">
            Already have an account?
            <a routerLink="/login" class="link">Sign in</a>
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .register-container { display: flex; justify-content: center; align-items: center; min-height: 60vh; }
    .register-card { max-width: 400px; width: 100%; padding: 32px; }
    .register-card h2 { text-align: center; margin-bottom: 4px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 24px; font-size: 14px; }
    .full-width { width: 100%; }
    .error-banner { background: #ffebee; color: #c62828; padding: 12px; border-radius: 4px; margin-bottom: 16px; font-size: 13px; }
    .login-link { text-align: center; font-size: 13px; color: #666; }
    .link { color: #3f51b5; cursor: pointer; text-decoration: none; }
    .link:hover { text-decoration: underline; }
  `,
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  displayName = '';
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  register() {
    if (!this.displayName || !this.email || !this.password) {
      this.error.set('All fields are required');
      return;
    }
    if (this.password.length < 6) {
      this.error.set('Password must be at least 6 characters');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.auth.register(this.email, this.password, this.displayName).subscribe({
      next: () => {
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Registration failed');
      },
    });
  }
}
