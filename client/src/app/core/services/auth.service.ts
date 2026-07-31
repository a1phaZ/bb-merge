import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  plan: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface UsageInfo {
  plan: string;
  providers: { current: number; limit: number | null };
  mr: { current: number; limit: number | null };
  limits: {
    providers: number | null;
    mrPerMonth: number | null;
    historyDays: number | null;
    templates: boolean;
    webhooks: boolean;
  };
  resetDate: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  user = signal<AuthUser | null>(null);
  isAuthenticated = computed(() => this.user() !== null);
  token = signal<string | null>(null);

  constructor() {
    const saved = localStorage.getItem('mr_auth');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.token.set(data.token);
        this.user.set(data.user);
      } catch { }
    }
  }

  register(email: string, password: string, displayName: string) {
    return this.http.post<AuthResponse>('/api/v1/auth/register', { email, password, displayName }).pipe(
      tap(res => this.setSession(res)),
    );
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>('/api/v1/auth/login', { email, password }).pipe(
      tap(res => this.setSession(res)),
    );
  }

  me() {
    return this.http.get<AuthUser>('/api/v1/auth/me').pipe(
      tap(user => this.user.set(user)),
    );
  }

  getUsage() {
    return this.http.get<UsageInfo>('/api/v1/auth/usage');
  }

  logout() {
    this.user.set(null);
    this.token.set(null);
    localStorage.removeItem('mr_auth');
  }

  private setSession(res: AuthResponse) {
    this.token.set(res.token);
    this.user.set(res.user);
    localStorage.setItem('mr_auth', JSON.stringify({ token: res.token, user: res.user }));
  }
}
