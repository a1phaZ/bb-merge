import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import webhooksRouter from '../routes/webhooks';
import { errorHandler } from '../middleware/error-handler';

let mockEvents: any[];

const mockProviders: Record<string, any> = {};

const mockStorage = {
  getProvider: vi.fn(async (id: string) => mockProviders[id] || null),
  saveProvider: vi.fn(async (p: any) => { mockProviders[p.id] = p; }),
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

vi.mock('../providers/factory', () => ({
  ProviderFactory: {
    create: vi.fn(),
  },
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
    Object.keys(mockProviders).forEach(k => delete mockProviders[k]);
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

  describe('POST /api/v1/webhooks/register/:providerId', () => {
    it('registers a webhook for a valid provider', async () => {
      mockProviders['p1'] = { id: 'p1', type: 'bitbucket', token: 'tok' };
      const { ProviderFactory } = await import('../providers/factory');
      (ProviderFactory.create as any).mockReturnValue({
        registerWebhook: vi.fn().mockResolvedValue({ id: 42, name: 'webhook', url: 'https://hook.example.com', active: true, events: ['pr:merged'] }),
      });

      const app = createApp();
      const res = await request(app)
        .post('/api/v1/webhooks/register/p1')
        .send({ project: 'PROJ', repo: 'my-repo', url: 'https://hook.example.com', events: ['pr:merged'] });
      expect(res.status).toBe(201);
      expect(res.body.id).toBe(42);
      expect(res.body.active).toBe(true);
    });

    it('returns 404 for unknown provider', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/webhooks/register/unknown')
        .send({ project: 'PROJ', repo: 'my-repo', url: 'https://hook.example.com' });
      expect(res.status).toBe(404);
    });

    it('returns 400 when project/repo/url are missing', async () => {
      mockProviders['p1'] = { id: 'p1', type: 'bitbucket', token: 'tok' };
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/webhooks/register/p1')
        .send({ project: 'PROJ' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/webhooks/receive/:providerId', () => {
    it('stores incoming webhook for any provider type', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/webhooks/receive/gitlab')
        .set('x-gitlab-event', 'Merge Request Hook')
        .send({ object_kind: 'merge_request', event_type: 'merge_request' });
      expect(res.status).toBe(200);
      expect(mockEvents).toHaveLength(1);
      expect(mockEvents[0].providerId).toBe('gitlab');
      expect(mockEvents[0].eventType).toBe('Merge Request Hook');
    });

    it('accepts github-style events', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/webhooks/receive/github')
        .set('x-github-event', 'pull_request')
        .send({ action: 'opened', pull_request: { number: 1 } });
      expect(res.status).toBe(200);
      expect(mockEvents).toHaveLength(1);
      expect(mockEvents[0].providerId).toBe('github');
      expect(mockEvents[0].eventType).toBe('pull_request');
    });
  });

  describe('POST /api/v1/webhooks/:providerId (catch-all receiver)', () => {
    it('stores incoming webhook for any provider via dynamic route', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/webhooks/custom-provider')
        .set('x-event-key', 'custom:event')
        .send({ data: 'test' });
      expect(res.status).toBe(200);
      expect(mockEvents).toHaveLength(1);
      expect(mockEvents[0].providerId).toBe('custom-provider');
      expect(mockEvents[0].eventType).toBe('custom:event');
    });

    it('falls back to unknown event type when no header', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/webhooks/test')
        .send({});
      expect(res.status).toBe(200);
      expect(mockEvents).toHaveLength(1);
      expect(mockEvents[0].eventType).toBe('unknown');
    });
  });
});
