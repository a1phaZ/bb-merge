import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-wizard',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <div class="wizard-container">
      <mat-card class="wizard-card">
        <mat-card-content>
          <h2>Setup Wizard</h2>
          <p>Guided setup for first-time configuration. Coming in v2.0.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .wizard-container { display: flex; justify-content: center; align-items: center; min-height: 60vh; }
    .wizard-card { max-width: 600px; width: 100%; text-align: center; padding: 48px; }
  `,
})
export class WizardComponent {}
