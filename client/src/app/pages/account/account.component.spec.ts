import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AccountComponent } from './account.component';
import { AuthService, AuthUser, UsageInfo } from '../../core/services/auth.service';

describe('AccountComponent', () => {
  let fixture: ComponentFixture<AccountComponent>;
  let authMock: any;

  const user: AuthUser = {
    id: 'u1', email: 'a@b.c', displayName: 'Alice', role: 'admin', plan: 'free',
    createdAt: '2026-01-01T00:00:00Z',
  };

  function usage(overrides: Partial<UsageInfo> = {}): UsageInfo {
    return {
      plan: 'free',
      providers: { current: 1, limit: 1 },
      mr: { current: 2, limit: 3 },
      limits: { providers: 1, mrPerMonth: 3, historyDays: 7, templates: false, webhooks: false },
      resetDate: '2026-08-01T00:00:00Z',
      ...overrides,
    };
  }

  async function createComponent(usageData: UsageInfo) {
    authMock = {
      user: signal(user),
      getUsage: vi.fn().mockReturnValue(of(usageData)),
    };
    await TestBed.configureTestingModule({
      imports: [AccountComponent],
      providers: [
        provideTranslateService(),
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AccountComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('renders the profile from the auth user', async () => {
    await createComponent(usage());
    const el = fixture.nativeElement;
    expect(el.textContent).toContain('Alice');
    expect(el.textContent).toContain('a@b.c');
    expect(el.textContent).toContain('admin');
  });

  it('renders the plan name', async () => {
    await createComponent(usage());
    const el = fixture.nativeElement;
    expect(el.querySelector('.plan-name')).toBeTruthy();
    expect(el.textContent).toContain('plan.free');
  });

  it('renders usage counts and remaining', async () => {
    await createComponent(usage());
    const el = fixture.nativeElement;
    expect(el.textContent).toContain('1 / 1');
    expect(el.textContent).toContain('2 / 3');
    expect(el.textContent).toContain('account.remaining');
    expect(el.querySelectorAll('mat-progress-bar').length).toBe(2);
  });

  it('shows unlimited for self-hosted plan', async () => {
    await createComponent(usage({
      plan: 'self-hosted',
      providers: { current: 50, limit: null },
      mr: { current: 999, limit: null },
      limits: { providers: null, mrPerMonth: null, historyDays: null, templates: true, webhooks: true },
    }));
    const el = fixture.nativeElement;
    expect(el.textContent).toContain('∞');
    expect(el.querySelectorAll('mat-progress-bar').length).toBe(0);
  });

  it('shows error state when usage request fails', async () => {
    authMock = {
      user: signal(user),
      getUsage: vi.fn(() => throwError(() => new Error('boom'))),
    };
    await TestBed.configureTestingModule({
      imports: [AccountComponent],
      providers: [
        provideTranslateService(),
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AccountComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement;
    expect(el.querySelector('.error-card')).toBeTruthy();
  });

  it('computes progress and usage labels', async () => {
    await createComponent(usage());
    const comp = fixture.componentInstance;
    expect(comp.progress(1, 3)).toBe(33);
    expect(comp.progress(3, 3)).toBe(100);
    expect(comp.progress(0, 0)).toBe(0);
    expect(comp.usageLabel(1, 3)).toBe('1 / 3');
    expect(comp.usageLabel(1, null)).toBe('1 / ∞');
  });
});
