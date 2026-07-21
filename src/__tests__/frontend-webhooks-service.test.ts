import { describe, it, expect, vi, beforeEach } from 'vitest';

class WebhooksService {
  constructor(private http: any) {}

  getEvents(limit?: number) {
    const params = limit ? `?limit=${limit}` : '';
    return this.http.get(`/api/v1/webhooks/events${params}`);
  }

  deleteEvents() {
    return this.http.delete('/api/v1/webhooks/events');
  }
}

describe('WebhooksService', () => {
  let http: any;

  beforeEach(() => {
    http = { get: vi.fn(), delete: vi.fn() };
  });

  it('getEvents calls GET /api/v1/webhooks/events', () => {
    const service = new WebhooksService(http);
    service.getEvents();
    expect(http.get).toHaveBeenCalledWith('/api/v1/webhooks/events');
  });

  it('getEvents with limit param', () => {
    const service = new WebhooksService(http);
    service.getEvents(10);
    expect(http.get).toHaveBeenCalledWith('/api/v1/webhooks/events?limit=10');
  });

  it('deleteEvents calls DELETE /api/v1/webhooks/events', () => {
    const service = new WebhooksService(http);
    service.deleteEvents();
    expect(http.delete).toHaveBeenCalledWith('/api/v1/webhooks/events');
  });
});
