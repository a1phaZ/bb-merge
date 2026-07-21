import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import settingsRouter from '../routes/settings';
import { errorHandler } from '../middleware/error-handler';

vi.mock('../storage/factory', () => ({
  getStorageProvider: vi.fn().mockResolvedValue({
    getSettings: vi.fn().mockResolvedValue({ theme: 'dark', pollingInterval: 30 }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
  }),
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/settings', settingsRouter);
  app.use(errorHandler);
  return app;
}

describe('Settings API', () => {
  it('GET returns current settings', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/settings');
    expect(res.status).toBe(200);
    expect(res.body.theme).toBe('dark');
  });

  it('PUT saves settings', async () => {
    const app = createApp();
    const res = await request(app)
      .put('/api/v1/settings')
      .send({ theme: 'light' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('GET /storage-type returns storage type', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/settings/storage-type');
    expect(res.status).toBe(200);
    expect(res.body.type).toBeDefined();
  });
});
