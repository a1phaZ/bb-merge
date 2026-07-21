import { Injectable } from '@angular/core';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly TTL = 10 * 60 * 1000;

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = this.TTL): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidate(pattern?: string): void {
    if (!pattern) { this.store.clear(); return; }
    for (const key of this.store.keys()) {
      if (key.startsWith(pattern)) this.store.delete(key);
    }
  }
}
