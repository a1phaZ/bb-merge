import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import historyRouter from '../routes/history';
import { errorHandler } from '../middleware/error-handler';

const mockStorage = vi.hoisted(() => ({
  getHistory: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 }),
  getHistoryItem: vi.fn().mockResolvedValue(null),
  getHistoryStats: vi.fn().mockResolvedValue([
    { date: '2026-07-01', total: 5, merged: 3, conflicts: 1, errors: 1 },
    { date: '2026-07-02', total: 8, merged: 6, conflicts: 1, errors: 1 },
  ]),
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

  it('returns stats for default days', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/history/stats');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0]).toHaveProperty('date');
    expect(res.body[0]).toHaveProperty('total');
  });

  it('returns stats for custom days', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/history/stats?days=7');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('returns 400 for invalid days value', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/history/stats?days=abc');
    expect(res.status).toBe(400);
  });

  it('returns stats which calls getHistoryStats on storage', async () => {
    mockStorage.getHistoryStats.mockClear();
    const app = createApp();
    await request(app).get('/api/v1/history/stats?days=14');
    expect(mockStorage.getHistoryStats).toHaveBeenCalledWith(14);
  });

  it('deletes all history', async () => {
    const app = createApp();
    const res = await request(app).delete('/api/v1/history');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
