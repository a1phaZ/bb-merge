import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-content>
          <h2>Merge Request Creator</h2>
          <p>Login page — coming in v2.0</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .login-container { display: flex; justify-content: center; align-items: center; min-height: 60vh; }
    .login-card { max-width: 400px; width: 100%; text-align: center; padding: 32px; }
  `,
})
export class LoginComponent {}
