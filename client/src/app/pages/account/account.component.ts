import { Component, inject, computed, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService, UsageInfo } from '../../core/services/auth.service';

type BillingState = 'idle' | 'processing' | 'success' | 'error';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatIconModule, MatListModule, MatButtonModule, MatProgressBarModule,
    TranslatePipe,
  ],
  template: `
    <h1 class="page-title mat-headline-4">{{ 'account.title' | translate }}</h1>

    @if (billingState() === 'processing') {
      <mat-card class="billing-processing">
        <mat-card-content>
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          <span>{{ 'account.billing.processing' | translate }}</span>
        </mat-card-content>
      </mat-card>
    }

    @if (billingState() === 'success') {
      <mat-card class="billing-ok">
        <mat-card-content>
          <mat-icon>check_circle</mat-icon>
          <span>{{ 'account.billing.success' | translate }}</span>
        </mat-card-content>
      </mat-card>
    }

    @if (billingState() === 'error') {
      <mat-card class="billing-error">
        <mat-card-content>
          <mat-icon>error</mat-icon>
          <span>{{ 'account.billing.error' | translate }}</span>
        </mat-card-content>
      </mat-card>
    }

    @if (usageRes.isLoading()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    @if (usageRes.error()) {
      <mat-card class="error-card">
        <mat-card-content>
          <mat-icon>error</mat-icon>
          <span>{{ 'account.loadFailed' | translate }}</span>
        </mat-card-content>
      </mat-card>
    }

    @if (usage(); as u) {
      <div class="account-grid">
        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ 'account.profile' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item>
                <mat-icon matListItemIcon>person</mat-icon>
                <span matListItemTitle>{{ auth.user()?.displayName || '—' }}</span>
                <span matListItemLine>{{ 'account.displayName' | translate }}</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListItemIcon>email</mat-icon>
                <span matListItemTitle>{{ auth.user()?.email || '—' }}</span>
                <span matListItemLine>{{ 'account.email' | translate }}</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListItemIcon>badge</mat-icon>
                <span matListItemTitle>{{ auth.user()?.role || '—' }}</span>
                <span matListItemLine>{{ 'account.role' | translate }}</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListItemIcon>event</mat-icon>
                <span matListItemTitle>{{ auth.user()?.createdAt ? (auth.user()?.createdAt | date:'mediumDate') : '—' }}</span>
                <span matListItemLine>{{ 'account.memberSince' | translate }}</span>
              </mat-list-item>
            </mat-list>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ 'account.currentPlan' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="plan-name">
              <mat-icon>workspace_premium</mat-icon>
              <span>{{ ('plan.' + u.plan) | translate }}</span>
            </div>

            @if (sub(); as s) {
              <mat-card class="subscription-card">
                <mat-card-header>
                  <mat-card-title>{{ 'account.subscription.title' | translate }}</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <mat-list>
                    <mat-list-item>
                      <mat-icon matListItemIcon>verified</mat-icon>
                      <span matListItemTitle>{{ statusKey(s.status) | translate }}</span>
                      <span matListItemLine>{{ 'account.subscription.status' | translate }}</span>
                    </mat-list-item>
                    <mat-list-item>
                      <mat-icon matListItemIcon>event</mat-icon>
                      <span matListItemTitle>{{ s.currentPeriodEnd | date:'mediumDate' }}</span>
                      <span matListItemLine>{{ 'account.subscription.renews' | translate }}</span>
                    </mat-list-item>
                    @if (s.status === 'past_due') {
                      <mat-list-item>
                        <mat-icon matListItemIcon color="warn">warning</mat-icon>
                        <span matListItemTitle>{{ 'account.subscription.pastDue' | translate }}</span>
                      </mat-list-item>
                    }
                    @if (s.status === 'canceled') {
                      <mat-list-item>
                        <mat-icon matListItemIcon>block</mat-icon>
                        <span matListItemTitle>{{ 'account.subscription.canceled' | translate }}</span>
                        <span matListItemLine>{{ 'account.subscription.accessUntil' | translate }} {{ s.currentPeriodEnd | date:'mediumDate' }}</span>
                      </mat-list-item>
                    }
                  </mat-list>

                  @if (s.status === 'active') {
                    <div class="cancel-zone">
                      @if (!confirmingCancel()) {
                        <button mat-stroked-button color="warn" [disabled]="canceling()" (click)="cancel()">
                          {{ 'account.subscription.cancel' | translate }}
                        </button>
                      } @else {
                        <span class="confirm-text">{{ 'account.subscription.cancelConfirm' | translate }}</span>
                        <button mat-flat-button color="warn" [disabled]="canceling()" (click)="cancel()">
                          {{ 'account.subscription.yesCancel' | translate }}
                        </button>
                        <button mat-stroked-button [disabled]="canceling()" (click)="confirmingCancel.set(false)">
                          {{ 'account.subscription.no' | translate }}
                        </button>
                      }
                    </div>
                    @if (cancelError()) {
                      <div class="cancel-error">{{ 'account.subscription.cancelError' | translate }}</div>
                    }
                  }
                </mat-card-content>
              </mat-card>
            }

            <mat-list class="features">
              <mat-list-item>
                <mat-icon matListItemIcon [class.dim]="u.limits.templates === false">description</mat-icon>
                <span matListItemTitle>{{ 'account.feature.templates' | translate }}</span>
                <span matListItemLine>{{ (u.limits.templates ? 'account.feature.enabled' : 'account.feature.disabled') | translate }}</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListItemIcon [class.dim]="u.limits.webhooks === false">webhook</mat-icon>
                <span matListItemTitle>{{ 'account.feature.webhooks' | translate }}</span>
                <span matListItemLine>{{ (u.limits.webhooks ? 'account.feature.enabled' : 'account.feature.disabled') | translate }}</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListItemIcon>history</mat-icon>
                <span matListItemTitle>{{ 'account.feature.history' | translate }}</span>
                @if (u.limits.historyDays !== null) {
                  <span matListItemLine>{{ 'account.feature.historyDays' | translate:{ days: u.limits.historyDays } }}</span>
                } @else {
                  <span matListItemLine>∞</span>
                }
              </mat-list-item>
            </mat-list>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="usage-card">
        <mat-card-header>
          <mat-card-title>{{ 'account.usage' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="usage-block">
            <div class="usage-label">
              <span>{{ 'account.providers' | translate }}</span>
              <span>{{ usageLabel(u.providers.current, u.providers.limit) }}</span>
            </div>
            @if (u.providers.limit !== null) {
              <mat-progress-bar mode="determinate"
                [value]="progress(u.providers.current, u.providers.limit)"
                color="{{ u.providers.current >= u.providers.limit ? 'warn' : 'primary' }}"></mat-progress-bar>
              <div class="usage-remain">{{ 'account.remaining' | translate }}: {{ u.providers.limit - u.providers.current }}</div>
            } @else {
              <div class="usage-remain">{{ 'account.unlimited' | translate }}</div>
            }
          </div>

          <div class="usage-block">
            <div class="usage-label">
              <span>{{ 'account.mrPerMonth' | translate }}</span>
              <span>{{ usageLabel(u.mr.current, u.mr.limit) }}</span>
            </div>
            @if (u.mr.limit !== null) {
              <mat-progress-bar mode="determinate"
                [value]="progress(u.mr.current, u.mr.limit)"
                color="{{ u.mr.current >= u.mr.limit ? 'warn' : 'primary' }}"></mat-progress-bar>
              <div class="usage-remain">{{ 'account.remaining' | translate }}: {{ u.mr.limit - u.mr.current }}</div>
            } @else {
              <div class="usage-remain">{{ 'account.unlimited' | translate }}</div>
            }
            <div class="usage-reset">{{ 'account.resetDate' | translate }}: {{ u.resetDate | date:'mediumDate' }}</div>
          </div>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: `
    .page-title { margin-top: 0; }
    .account-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    @media (max-width: 768px) { .account-grid { grid-template-columns: 1fr; } }
    .error-card mat-card-content { display: flex; align-items: center; gap: 12px; color: #c62828; }
    .billing-processing mat-card-content { display: flex; flex-direction: column; gap: 12px; }
    .billing-ok mat-card-content { display: flex; align-items: center; gap: 12px; color: #2e7d32; }
    .billing-error mat-card-content { display: flex; align-items: center; gap: 12px; color: #c62828; }
    .plan-name { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 500; margin-bottom: 8px; }
    .plan-name mat-icon { color: #3f51b5; }
    .subscription-card { margin-top: 12px; border: 1px solid rgba(0,0,0,0.12); }
    .cancel-zone { display: flex; align-items: center; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
    .confirm-text { font-size: 13px; color: rgba(0,0,0,0.6); }
    .cancel-error { margin-top: 8px; font-size: 13px; color: #c62828; }
    .features { margin-top: 8px; }
    .dim { color: rgba(0,0,0,0.3); }
    .usage-card mat-card-content { display: flex; flex-direction: column; gap: 20px; }
    .usage-block { display: flex; flex-direction: column; gap: 6px; }
    .usage-label { display: flex; justify-content: space-between; align-items: center; }
    .usage-label span:last-child { font-weight: 500; }
    .usage-remain { font-size: 13px; color: rgba(0,0,0,0.6); }
    .usage-reset { font-size: 13px; color: rgba(0,0,0,0.5); }
  `,
})
export class AccountComponent {
  auth = inject(AuthService);

  sub = computed(() => this.auth.subscription());

  billingState = signal<BillingState>('idle');
  confirmingCancel = signal(false);
  canceling = signal(false);
  cancelError = signal(false);

  usageRes = rxResource<UsageInfo, void>({
    stream: () => this.auth.getUsage(),
  });

  usage = computed<UsageInfo | undefined>(() =>
    this.usageRes.error() ? undefined : this.usageRes.value(),
  );

  constructor() {
    this.handleBillingReturn();
  }

  statusKey(status: string): string {
    return `account.subscription.status${status.charAt(0).toUpperCase() + status.slice(1)}`;
  }

  cancel() {
    if (!this.confirmingCancel()) {
      this.confirmingCancel.set(true);
      return;
    }
    this.cancelError.set(false);
    this.canceling.set(true);
    this.auth.cancelSubscription().subscribe({
      next: () => {
        this.canceling.set(false);
        this.confirmingCancel.set(false);
        this.usageRes.reload();
      },
      error: () => {
        this.canceling.set(false);
        this.cancelError.set(true);
      },
    });
  }

  private queryParam(name: string): string | null {
    return new URLSearchParams(window.location.search).get(name);
  }

  private handleBillingReturn() {
    if (this.queryParam('billing') !== 'success') return;
    const paymentId = sessionStorage.getItem('mr_payment_id');
    sessionStorage.removeItem('mr_payment_id');
    if (!paymentId) {
      this.billingState.set('error');
      return;
    }
    this.billingState.set('processing');
    this.auth.confirmPayment(paymentId).subscribe({
      next: () => {
        this.billingState.set('success');
        this.usageRes.reload();
        this.cleanUrl();
      },
      error: () => this.billingState.set('error'),
    });
  }

  private cleanUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete('billing');
    url.searchParams.delete('plan');
    window.history.replaceState({}, '', url.toString());
  }

  progress(current: number, limit: number): number {
    if (limit <= 0) return 0;
    return Math.min(100, Math.round((current / limit) * 100));
  }

  usageLabel(current: number, limit: number | null): string {
    return limit === null ? `${current} / ∞` : `${current} / ${limit}`;
  }
}
