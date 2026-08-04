import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

function createMockClient() {
  return {
    checkBranchExists: vi.fn().mockResolvedValue(true),
    findExistingPR: vi.fn().mockResolvedValue(null),
    createPR: vi.fn().mockResolvedValue({ id: 1, version: 1 }),
    checkMergeConflicts: vi.fn().mockResolvedValue({ canMerge: true, conflicted: false }),
    mergePR: vi.fn().mockResolvedValue(undefined),
    getLastCommitter: vi.fn().mockResolvedValue({ name: 'user', displayName: 'User' }),
    addReviewer: vi.fn().mockResolvedValue(undefined),
    registerWebhook: vi.fn().mockResolvedValue({ id: 1 }),
  };
}

vi.mock('../bitbucket', () => {
  let currentClient = createMockClient();
  return {
    BitbucketClient: function MockClient() {
      return currentClient;
    },
    __setMockClient(client: any) {
      currentClient = client;
    },
  };
});

async function createApp() {
  const mergeRequestsRouter = (await import('../routes/merge-requests')).default;
  const app = express();
  app.use(express.json());
  app.use('/api/merge-requests', mergeRequestsRouter);
  return app;
}

describe('POST /api/merge-requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BITBUCKET_URL = 'https://bitbucket.example.com';
    process.env.BITBUCKET_USERNAME = 'user';
    process.env.BITBUCKET_PASSWORD = 'pass';
  });

  it('accepts valid JSON config and returns report', { timeout: 15000 }, async () => {
    const app = await createApp();
    const res = await request(app)
      .post('/api/merge-requests')
      .send({
        config: {
          project: 'MY_PROJECT',
          repo: 'my-repo',
          target: 'main',
          branches: ['feature/test'],
        },
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('report');
    expect(res.body).toHaveProperty('reportText');
    expect(res.body.report.results).toHaveLength(1);
  });

  it('accepts YAML string as config', async () => {
    const app = await createApp();
    const yaml = `project: MY_PROJECT
repo: my-repo
target: main
branches:
  - feature/test
`;
    const res = await request(app)
      .post('/api/merge-requests')
      .send({ config: yaml });
    expect(res.status).toBe(200);
    expect(res.body.report.results).toHaveLength(1);
  });

  it('returns 400 when config is missing', async () => {
    const app = await createApp();
    const res = await request(app)
      .post('/api/merge-requests')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when config is invalid', async () => {
    const app = await createApp();
    const res = await request(app)
      .post('/api/merge-requests')
      .send({ config: { invalid: true } });
    expect(res.status).toBe(400);
  });
});
