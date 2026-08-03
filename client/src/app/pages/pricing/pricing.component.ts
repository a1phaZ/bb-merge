import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';

interface PlanCard {
  id: string;
  nameKey: string;
  price: number;
  once: boolean;
  tagline: string;
  featured: boolean;
}

interface PlanFeatureRow {
  key: string;
  values: string[];
}

const PLANS: PlanCard[] = [
  { id: 'free', nameKey: 'plan.free', price: 0, once: false, tagline: 'pricing.tagline.free', featured: false },
  { id: 'pro', nameKey: 'plan.pro', price: 9, once: false, tagline: 'pricing.tagline.pro', featured: true },
  { id: 'business', nameKey: 'plan.business', price: 29, once: false, tagline: 'pricing.tagline.business', featured: false },
  { id: 'self-hosted', nameKey: 'plan.selfHosted', price: 299, once: true, tagline: 'pricing.tagline.selfHosted', featured: false },
];

const FEATURES: PlanFeatureRow[] = [
  { key: 'pricing.feature.providers', values: ['1', '5', '∞', '∞'] },
  { key: 'pricing.feature.mrPerMonth', values: ['3', '100', '1000', '∞'] },
  { key: 'pricing.feature.historyDays', values: ['7', '90', '∞', '∞'] },
  { key: 'pricing.feature.templates', values: ['—', '✓', '✓', '✓'] },
  { key: 'pricing.feature.webhooks', values: ['—', '✓', '✓', '✓'] },
  { key: 'pricing.feature.team', values: ['—', '—', '10', '∞'] },
  { key: 'pricing.feature.sso', values: ['—', '—', '✓', '✓'] },
];

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatIconModule, MatButtonModule, MatTooltipModule, MatDividerModule, MatListModule,
    TranslatePipe,
  ],
  template: `
    <div class="pricing-header">
      <h1 class="page-title mat-headline-4">{{ 'pricing.title' | translate }}</h1>
      <p class="pricing-subtitle">{{ 'pricing.subtitle' | translate }}</p>
    </div>

    <div class="pricing-grid">
      @for (plan of plans; track plan.id; let planIndex = $index) {
        <mat-card class="plan-card" [class.featured]="plan.featured" [class.current]="isCurrent(plan.id)">
          <mat-card-header>
            <mat-card-title>
              {{ plan.nameKey | translate }}
              @if (isCurrent(plan.id)) {
                <span class="current-badge">{{ 'pricing.currentPlan' | translate }}</span>
              }
            </mat-card-title>
            <mat-card-subtitle>{{ plan.tagline | translate }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="price">
              <span class="price-amount">{{ '$' + plan.price }}</span>
              @if (plan.price > 0) {
                <span class="price-period">{{ plan.once ? ('pricing.once' | translate) : ('pricing.perMonth' | translate) }}</span>
              } @else {
                <span class="price-period">{{ 'pricing.free' | translate }}</span>
              }
            </div>

            <mat-divider></mat-divider>

            <mat-list>
              @for (feature of features; track feature.key) {
                <mat-list-item class="feature-row">
                  <span matListItemTitle>{{ feature.key | translate }}</span>
                  <span matListItemLine class="feature-value">{{ feature.values[planIndex] }}</span>
                </mat-list-item>
              }
            </mat-list>
          </mat-card-content>
          <mat-card-actions align="end">
            @if (isCurrent(plan.id)) {
              <button mat-stroked-button disabled>{{ 'pricing.currentPlan' | translate }}</button>
            } @else {
              <button mat-raised-button [color]="plan.featured ? 'primary' : undefined" disabled
                matTooltip="{{ 'pricing.upgradeSoon' | translate }}">
                {{ 'pricing.upgrade' | translate }}
              </button>
            }
          </mat-card-actions>
        </mat-card>
      }
    </div>
  `,
  styles: `
    .pricing-header { text-align: center; margin-bottom: 32px; }
    .pricing-subtitle { color: rgba(0,0,0,0.6); margin-top: 4px; }
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; align-items: start; }
    .plan-card.featured { border: 2px solid #3f51b5; }
    .plan-card.current { outline: 2px solid rgba(63, 81, 181, 0.4); }
    .current-badge { display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; background: #3f51b5; color: #fff; vertical-align: middle; }
    .price { display: flex; align-items: baseline; gap: 6px; padding: 12px 0; }
    .price-amount { font-size: 28px; font-weight: 500; }
    .price-period { font-size: 13px; color: rgba(0,0,0,0.6); }
    .feature-row { height: 44px; }
    .feature-value { font-weight: 500; }
    mat-card-actions { padding-bottom: 12px; }
  `,
})
export class PricingComponent {
  auth = inject(AuthService);

  plans = PLANS;
  features = FEATURES;

  currentPlan = computed(() => this.auth.user()?.plan ?? 'free');

  isCurrent(id: string): boolean {
    return this.currentPlan() === id;
  }
}
