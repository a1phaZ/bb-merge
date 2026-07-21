import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import providersRouter from '../routes/providers';
import { AppError, errorHandler } from '../middleware/error-handler';

vi.mock('../storage/factory', () => {
  const mockProviders: Record<string, any> = {};
  return {
    getStorageProvider: vi.fn().mockResolvedValue({
      getProviders: vi.fn().mockResolvedValue(Object.values(mockProviders)),
      getProvider: vi.fn().mockImplementation(async (id: string) => mockProviders[id] || null),
      saveProvider: vi.fn().mockImplementation(async (p: any) => { mockProviders[p.id] = p; }),
      deleteProvider: vi.fn().mockImplementation(async (id: string) => { delete mockProviders[id]; }),
    }),
  };
});

vi.mock('../providers/factory', () => ({
  ProviderFactory: {
    register: vi.fn(),
    create: vi.fn().mockReturnValue({
      testConnection: vi.fn().mockResolvedValue({ ok: true }),
      listBranches: vi.fn().mockResolvedValue([
        { name: 'main', sha: 'abc123' },
        { name: 'feature/test', sha: 'def456' },
        { name: 'develop', sha: 'ghi789' },
      ]),
    }),
  },
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/providers', providersRouter);
  app.use(errorHandler);
  return app;
}

describe('GET /api/v1/providers', () => {
  it('returns empty list initially', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/providers');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/v1/providers', () => {
  it('creates a provider with valid data', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/v1/providers')
      .send({
        name: 'My Bitbucket',
        type: 'bitbucket',
        apiUrl: 'https://bitbucket.example.com',
        token: 'my-token',
        defaultTarget: 'main',
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('My Bitbucket');
    expect(res.body.type).toBe('bitbucket');
    expect(res.body.token).toBe('••••••••');
    expect(res.body.id).toBeDefined();
  });

  it('returns 400 when required fields are missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/v1/providers')
      .send({ name: 'Incomplete' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid provider type', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/v1/providers')
      .send({
        name: 'Invalid',
        type: 'azure',
        apiUrl: 'https://dev.azure.com',
        token: 'token',
      });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/providers/:id', () => {
  it('returns created provider by id', async () => {
    const app = createApp();
    const create = await request(app)
      .post('/api/v1/providers')
      .send({ name: 'Test', type: 'gitlab', apiUrl: 'https://gitlab.com', token: 'token' });
    const id = create.body.id;

    const res = await request(app).get(`/api/v1/providers/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test');
  });

  it('returns 404 for unknown id', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/providers/unknown');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/v1/providers/:id', () => {
  it('updates an existing provider', async () => {
    const app = createApp();
    const create = await request(app)
      .post('/api/v1/providers')
      .send({ name: 'Old Name', type: 'github', apiUrl: 'https://github.com', token: 'token' });
    const id = create.body.id;

    const res = await request(app)
      .put(`/api/v1/providers/${id}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });
});

describe('DELETE /api/v1/providers/:id', () => {
  it('deletes a provider', async () => {
    const app = createApp();
    const create = await request(app)
      .post('/api/v1/providers')
      .send({ name: 'Delete Me', type: 'bitbucket', apiUrl: 'https://bb.example.com', token: 'token' });
    const id = create.body.id;

    const del = await request(app).delete(`/api/v1/providers/${id}`);
    expect(del.status).toBe(200);

    const get = await request(app).get(`/api/v1/providers/${id}`);
    expect(get.status).toBe(404);
  });
});

describe('POST /api/v1/providers/:id/test', () => {
  it('tests connection with existing provider', async () => {
    const app = createApp();
    const create = await request(app)
      .post('/api/v1/providers')
      .send({ name: 'Test Conn', type: 'bitbucket', apiUrl: 'https://bb.example.com', token: 'token' });
    const id = create.body.id;

    const res = await request(app).post(`/api/v1/providers/${id}/test`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('GET /api/v1/providers/:id/branches', () => {
  it('lists branches for a provider', async () => {
    const app = createApp();
    const create = await request(app)
      .post('/api/v1/providers')
      .send({ name: 'Branch Test', type: 'bitbucket', apiUrl: 'https://bb.example.com', token: 'token' });
    const id = create.body.id;

    const res = await request(app)
      .get(`/api/v1/providers/${id}/branches?project=PROJ&repo=repo`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].name).toBe('main');
  });

  it('returns 400 if project or repo missing', async () => {
    const app = createApp();
    const create = await request(app)
      .post('/api/v1/providers')
      .send({ name: 'Test', type: 'bitbucket', apiUrl: 'https://bb.example.com', token: 'token' });
    const id = create.body.id;

    const res = await request(app).get(`/api/v1/providers/${id}/branches`);
    expect(res.status).toBe(400);
  });
});
