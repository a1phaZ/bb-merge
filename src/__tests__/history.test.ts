import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import historyRouter from '../routes/history';
import { errorHandler } from '../middleware/error-handler';

const mockStorage = vi.hoisted(() => ({
  getHistory: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 }),
  getHistoryItem: vi.fn().mockResolvedValue(null),
  deleteHistory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../storage/factory', () => ({
  getStorageProvider: vi.fn().mockResolvedValue(mockStorage),
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/history', historyRouter);
  app.use(errorHandler);
  return app;
}

describe('History API', () => {
  it('returns history list', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/history');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
  });

  it('returns 404 for unknown history item', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/history/unknown');
    expect(res.status).toBe(404);
  });

  it('returns a history item by id', async () => {
    mockStorage.getHistoryItem.mockResolvedValue({ id: 'abc123', project: 'PROJ', status: 'completed' });
    const app = createApp();
    const res = await request(app).get('/api/v1/history/abc123');
    expect(res.status).toBe(200);
    expect(res.body.project).toBe('PROJ');
  });

  it('deletes all history', async () => {
    const app = createApp();
    const res = await request(app).delete('/api/v1/history');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
