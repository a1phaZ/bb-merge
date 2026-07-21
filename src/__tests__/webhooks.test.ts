import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import webhooksRouter from '../routes/webhooks';
import { errorHandler } from '../middleware/error-handler';

let mockEvents: any[];

const mockStorage = {
  saveWebhookEvent: vi.fn(async (event: any) => { mockEvents.push(event); }),
  getWebhookEvents: vi.fn(async (limit?: number) => {
    const all = [...mockEvents].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    return limit ? all.slice(0, limit) : all;
  }),
  deleteWebhookEvents: vi.fn(async () => { mockEvents.length = 0; }),
};

vi.mock('../storage/factory', () => ({
  getStorageProvider: vi.fn(() => Promise.resolve(mockStorage)),
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/webhooks', webhooksRouter);
  app.use(errorHandler);
  return app;
}

describe('Webhooks API', () => {
  beforeEach(() => {
    mockEvents = [];
    vi.clearAllMocks();
  });

  describe('POST /api/v1/webhooks/bitbucket', () => {
    it('accepts bitbucket webhook and stores event', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/webhooks/bitbucket')
        .set('x-event-key', 'pr:merged')
        .send({ pullRequest: { id: 42, title: 'Fix bug', state: 'MERGED' } });
      expect(res.status).toBe(200);
      expect(mockEvents).toHaveLength(1);
      expect(mockEvents[0].eventType).toBe('pr:merged');
      expect(mockEvents[0].providerId).toBe('bitbucket');
    });

    it('accepts webhook without event key', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/webhooks/bitbucket')
        .send({ test: true });
      expect(res.status).toBe(200);
      expect(mockEvents).toHaveLength(1);
      expect(mockEvents[0].eventType).toBe('unknown');
    });

    it('handles storage failure gracefully', async () => {
      mockStorage.saveWebhookEvent = vi.fn().mockRejectedValue(new Error('Storage error'));
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/webhooks/bitbucket')
        .set('x-event-key', 'pr:updated')
        .send({ pullRequest: { id: 1, title: 'Test' } });
      expect(res.status).toBe(200);
      mockStorage.saveWebhookEvent = vi.fn(async (event: any) => { mockEvents.push(event); });
    });
  });

  describe('GET /api/v1/webhooks/events', () => {
    it('returns empty list when no events', async () => {
      const app = createApp();
      const res = await request(app).get('/api/v1/webhooks/events');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns stored events', async () => {
      mockEvents.push(
        { id: 1, providerId: 'bitbucket', eventType: 'pr:merged', payloadJson: '{}', receivedAt: '2024-01-01T00:00:00Z' },
        { id: 2, providerId: 'bitbucket', eventType: 'pr:updated', payloadJson: '{}', receivedAt: '2024-01-02T00:00:00Z' },
      );
      const app = createApp();
      const res = await request(app).get('/api/v1/webhooks/events');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].id).toBe(2);
      expect(res.body[1].id).toBe(1);
    });

    it('respects limit query param', async () => {
      for (let i = 1; i <= 10; i++) {
        mockEvents.push({ id: i, providerId: 'bitbucket', eventType: 'pr:merged', payloadJson: '{}', receivedAt: `2024-01-${String(i).padStart(2, '0')}T00:00:00Z` });
      }
      const app = createApp();
      const res = await request(app).get('/api/v1/webhooks/events?limit=3');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });
  });

  describe('DELETE /api/v1/webhooks/events', () => {
    it('clears all events', async () => {
      mockEvents.push({ id: 1, providerId: 'bitbucket', eventType: 'pr:merged', payloadJson: '{}', receivedAt: '2024-01-01T00:00:00Z' });
      const app = createApp();

      let res = await request(app).get('/api/v1/webhooks/events');
      expect(res.body).toHaveLength(1);

      res = await request(app).delete('/api/v1/webhooks/events');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      res = await request(app).get('/api/v1/webhooks/events');
      expect(res.body).toEqual([]);
    });
  });
});
