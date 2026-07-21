import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class WebhooksService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  getEvents(limit?: number) {
    const params = limit ? `?limit=${limit}` : '';
    return this.http.get<any[]>(`/api/v1/webhooks/events${params}`);
  }

  deleteEvents() {
    return this.http.delete<void>('/api/v1/webhooks/events');
  }
}
