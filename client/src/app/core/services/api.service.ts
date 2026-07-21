import { Injectable, inject, Signal, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { map, Observable, of, tap } from 'rxjs';
import { CacheService } from '../cache/cache.service';
import { ProviderConfig, ProviderCreate, GitBranch } from '../../shared/models/provider.model';
import { HistoryRecord, HistoryFilter, PaginatedResult } from '../../shared/models/history.model';
import { Template } from '../../shared/models/template.model';
import { MergeRequestCreate, MergeRequestResponse } from '../../shared/models/merge-result.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private cache = inject(CacheService);

  private resource<T>(key: string, loader: () => Observable<T>) {
    return rxResource<T, void>({
      loader: () => {
        const cached = this.cache.get<T>(key);
        if (cached) return of(cached);
        return loader().pipe(tap(data => this.cache.set(key, data)));
      },
    });
  }

  private invalidate(pattern: string) {
    this.cache.invalidate(pattern);
  }

  providers = this.resource<ProviderConfig[]>('providers', () =>
    this.http.get<ProviderConfig[]>('/api/v1/providers'));

  getProvider(id: string) {
    return this.http.get<ProviderConfig>(`/api/v1/providers/${id}`);
  }

  createProvider(data: ProviderCreate) {
    return this.http.post<ProviderConfig>('/api/v1/providers', data).pipe(
      tap(() => this.invalidate('providers')),
    );
  }

  updateProvider(id: string, data: Partial<ProviderConfig>) {
    return this.http.put<ProviderConfig>(`/api/v1/providers/${id}`, data).pipe(
      tap(() => this.invalidate('providers')),
    );
  }

  deleteProvider(id: string) {
    return this.http.delete<void>(`/api/v1/providers/${id}`).pipe(
      tap(() => this.invalidate('providers')),
    );
  }

  testConnection(id: string) {
    return this.http.post<{ ok: boolean; message: string }>(`/api/v1/providers/${id}/test`, {});
  }

  getBranches(id: string, project: string, repo: string, filter?: string) {
    let params = `project=${project}&repo=${repo}`;
    if (filter) params += `&filter=${filter}`;
    return this.http.get<GitBranch[]>(`/api/v1/providers/${id}/branches?${params}`);
  }

  createMergeRequest(data: MergeRequestCreate) {
    return this.http.post<MergeRequestResponse>('/api/v1/merge-requests', data);
  }

  getHistory(filter?: HistoryFilter) {
    const params = new URLSearchParams();
    if (filter?.page) params.set('page', String(filter.page));
    if (filter?.limit) params.set('limit', String(filter.limit));
    if (filter?.providerId) params.set('providerId', filter.providerId);
    if (filter?.search) params.set('search', filter.search);
    const qs = params.toString();
    return this.resource<PaginatedResult<HistoryRecord>>(`history?${qs}`, () =>
      this.http.get<PaginatedResult<HistoryRecord>>(`/api/v1/history?${qs}`));
  }

  getHistoryItem(id: string) {
    return this.http.get<HistoryRecord>(`/api/v1/history/${id}`);
  }

  deleteHistory() {
    return this.http.delete<void>('/api/v1/history').pipe(
      tap(() => this.invalidate('history')),
    );
  }

  getTemplates() {
    return this.resource<Template[]>('templates', () =>
      this.http.get<Template[]>('/api/v1/templates'));
  }

  getTemplate(id: string) {
    return this.http.get<Template>(`/api/v1/templates/${id}`);
  }

  createTemplate(data: Partial<Template>) {
    return this.http.post<Template>('/api/v1/templates', data).pipe(
      tap(() => this.invalidate('templates')),
    );
  }

  updateTemplate(id: string, data: Partial<Template>) {
    return this.http.put<Template>(`/api/v1/templates/${id}`, data).pipe(
      tap(() => this.invalidate('templates')),
    );
  }

  deleteTemplate(id: string) {
    return this.http.delete<void>(`/api/v1/templates/${id}`).pipe(
      tap(() => this.invalidate('templates')),
    );
  }

  getSettings() {
    return this.resource<Record<string, string>>('settings', () =>
      this.http.get<Record<string, string>>('/api/v1/settings'));
  }

  saveSettings(settings: Record<string, string>) {
    return this.http.put<void>('/api/v1/settings', settings).pipe(
      tap(() => this.invalidate('settings')),
    );
  }

  getStorageType() {
    return this.http.get<{ type: string }>('/api/v1/settings/storage-type');
  }

  getLogFiles() {
    return this.http.get<{ files: Array<{ name: string; size: number; createdAt: string; modifiedAt: string }> }>('/api/v1/logs');
  }

  getLogContent(filename: string) {
    return this.http.get(`/api/v1/logs/${filename}`, { responseType: 'text' });
  }

  deleteLogs() {
    return this.http.delete<void>('/api/v1/logs');
  }

  getHealth() {
    return this.http.get<{ status: string }>('/health');
  }
}
