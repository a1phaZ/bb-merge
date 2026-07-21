import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import templatesRouter from '../routes/templates';
import { errorHandler } from '../middleware/error-handler';

const mockTemplates = vi.hoisted(() => ({} as Record<string, any>));

const mockStorage = vi.hoisted(() => ({
  getTemplates: vi.fn().mockResolvedValue([]),
  getTemplate: vi.fn().mockResolvedValue(null),
  saveTemplate: vi.fn().mockImplementation(async (t: any) => { mockTemplates[t.id] = t; }),
  deleteTemplate: vi.fn().mockImplementation(async (id: string) => { delete mockTemplates[id]; }),
}));

vi.mock('../storage/factory', () => ({
  getStorageProvider: vi.fn().mockResolvedValue(mockStorage),
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/templates', templatesRouter);
  app.use(errorHandler);
  return app;
}

describe('Templates API', () => {
  it('returns empty list initially', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/templates');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('creates a template with valid data', async () => {
    mockStorage.getTemplates.mockResolvedValue(Object.values(mockTemplates));
    const app = createApp();
    const res = await request(app)
      .post('/api/v1/templates')
      .send({ name: 'Deploy to staging', target: 'staging' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Deploy to staging');
    expect(res.body.id).toBeDefined();
  });

  it('returns 400 when name is missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/v1/templates')
      .send({ target: 'main' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when target is missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/v1/templates')
      .send({ name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('retrieves a template by id', async () => {
    mockStorage.getTemplate.mockResolvedValue({ id: 'test-id', name: 'Test Template', target: 'develop' });
    const app = createApp();
    const res = await request(app).get('/api/v1/templates/test-id');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test Template');
  });

  it('returns 404 for unknown template id', async () => {
    mockStorage.getTemplate.mockResolvedValue(null);
    const app = createApp();
    const res = await request(app).get('/api/v1/templates/unknown');
    expect(res.status).toBe(404);
  });

  it('updates a template', async () => {
    mockStorage.getTemplate.mockResolvedValue({ id: 'update-id', name: 'Old', target: 'main' });
    const app = createApp();
    const res = await request(app)
      .put('/api/v1/templates/update-id')
      .send({ name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
  });

  it('returns 404 when updating unknown template', async () => {
    mockStorage.getTemplate.mockResolvedValue(null);
    const app = createApp();
    const res = await request(app)
      .put('/api/v1/templates/unknown')
      .send({ name: 'Test' });
    expect(res.status).toBe(404);
  });

  it('deletes a template', async () => {
    mockTemplates['del-id'] = { id: 'del-id', name: 'Delete Me', target: 'main' };
    mockStorage.getTemplates.mockResolvedValue(Object.values(mockTemplates));
    const app = createApp();

    const del = await request(app).delete('/api/v1/templates/del-id');
    expect(del.status).toBe(200);

    mockStorage.getTemplate.mockResolvedValue(null);
    const get = await request(app).get('/api/v1/templates/del-id');
    expect(get.status).toBe(404);
  });
});
