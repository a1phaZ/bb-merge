import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { planGuard } from './plan.guard';
import { AuthService } from '../services/auth.service';

describe('planGuard', () => {
  let authMock: any;
  let routerMock: any;

  function user(plan: string | null) {
    return plan
      ? { id: 'u1', email: 'a@b.c', displayName: 'A', role: 'operator', plan }
      : null;
  }

  beforeEach(() => {
    authMock = {
      user: signal(user('free')),
      isAuthenticated: vi.fn(() => authMock.user() !== null),
      canUseFeature: vi.fn((f: string) => authMock.user()?.plan !== 'free'),
    };
    routerMock = { parseUrl: vi.fn((url: string) => url) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('redirects free users to /pricing', () => {
    const guard = planGuard('templates');
    const result = TestBed.runInInjectionContext(guard);
    expect(result).toBe('/pricing');
  });

  it('redirects free users to /pricing for webhooks too', () => {
    const guard = planGuard('webhooks');
    const result = TestBed.runInInjectionContext(guard);
    expect(result).toBe('/pricing');
  });

  it('allows access on paid plans', () => {
    authMock.user.set(user('pro'));
    const guard = planGuard('templates');
    const result = TestBed.runInInjectionContext(guard);
    expect(result).toBe(true);
  });

  it('redirects to /login when not authenticated', () => {
    authMock.user.set(user(null));
    const guard = planGuard('templates');
    const result = TestBed.runInInjectionContext(guard);
    expect(result).toBe('/login');
  });
});
