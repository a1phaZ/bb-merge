import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../middleware/error-handler';

const mockProgressEvents: any[] = [];
let mockFinished = false;

let currentPlan = 'self-hosted';

const mockStorage = {
  getProvider: vi.fn(),
  saveHistory: vi.fn(),
  logUsage: vi.fn(),
};

const mockProviders: Record<string, any> = {};

vi.mock('../storage/factory', () => ({
  getStorageProvider: vi.fn(() => Promise.resolve(mockStorage)),
}));

vi.mock('../providers/factory', () => ({
  ProviderFactory: { create: vi.fn() },
}));

vi.mock('../routes/progress', () => ({
  addProgressEvent: vi.fn((sessionId: string, event: any) => {
    mockProgressEvents.push(event);
  }),
  finishProgress: vi.fn(() => { mockFinished = true; }),
  getOrCreateSession: vi.fn(() => ({ id: 'test-session', clients: [], events: [], done: false })),
}));

function createMockClient(overrides = {}) {
  return {
    checkBranchExists: vi.fn().mockResolvedValue(true),
    findExistingPR: vi.fn().mockResolvedValue(null),
    createPR: vi.fn().mockResolvedValue({ id: 1, version: 1 }),
    checkMergeConflicts: vi.fn().mockResolvedValue({ canMerge: true, conflicted: false }),
    mergePR: vi.fn().mockResolvedValue(undefined),
    getLastCommitter: vi.fn().mockResolvedValue({ name: 'user', displayName: 'User' }),
    addReviewer: vi.fn().mockResolvedValue(undefined),
    registerWebhook: vi.fn().mockResolvedValue({ id: 42 }),
    ...overrides,
  };
}

async function flushAsync() {
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setTimeout(resolve, 50));
}

let app: express.Express;

beforeAll(async () => {
  const router = (await import('../routes/merge-requests-v2')).default;
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { userId: 'u1', email: 'test@example.com', role: 'operator', plan: currentPlan };
    next();
  });
  app.use('/api/v1/merge-requests', router);
  app.use(errorHandler);
});

const validBody = {
  providerId: 'p1',
  project: 'PROJ',
  repo: 'my-repo',
  target: 'main',
  branches: ['feature/test'],
};

describe('POST /api/v1/merge-requests (v2)', () => {
  beforeEach(() => {
    mockProgressEvents.length = 0;
    mockFinished = false;
    currentPlan = 'self-hosted';
    Object.keys(mockProviders).forEach(k => delete mockProviders[k]);
    mockStorage.getProvider.mockReset();
    mockStorage.saveHistory.mockReset();
    vi.clearAllMocks();
  });

  it('returns 400 when required fields missing', async () => {
    const res = await request(app).post('/api/v1/merge-requests').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when branches array is empty', async () => {
    const res = await request(app).post('/api/v1/merge-requests').send({
      providerId: 'p1', project: 'PROJ', repo: 'repo', target: 'main', branches: [],
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when provider not found', async () => {
    mockStorage.getProvider.mockResolvedValue(null);
    const res = await request(app).post('/api/v1/merge-requests').send(validBody);
    expect(res.status).toBe(404);
  });

  it('creates PRs and reports progress in real mode', async () => {
    const mockClient = createMockClient();
    mockStorage.getProvider.mockResolvedValue({ id: 'p1', type: 'bitbucket', token: 'tok' });
    const { ProviderFactory } = await import('../providers/factory');
    (ProviderFactory.create as any).mockReturnValue(mockClient);

    const res = await request(app).post('/api/v1/merge-requests').send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Merge request creation started');

    await flushAsync();

    expect(mockClient.checkBranchExists).toHaveBeenCalledWith('PROJ', 'my-repo', 'feature/test');
    expect(mockClient.createPR).toHaveBeenCalled();
    expect(mockClient.checkMergeConflicts).toHaveBeenCalled();
    expect(mockStorage.saveHistory).toHaveBeenCalled();
    expect(mockStorage.logUsage).toHaveBeenCalledWith('u1', 'create_mr', 'p1');
    expect(mockFinished).toBe(true);
    expect(mockProgressEvents.some((e: any) => e.message.includes('Created PR'))).toBe(true);
  });

  it('dry run skips PR creation and reports what would happen', async () => {
    const mockClient = createMockClient();
    mockStorage.getProvider.mockResolvedValue({ id: 'p1', type: 'bitbucket', token: 'tok' });
    const { ProviderFactory } = await import('../providers/factory');
    (ProviderFactory.create as any).mockReturnValue(mockClient);

    const res = await request(app).post('/api/v1/merge-requests').send({ ...validBody, dryRun: true });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Dry run started');

    await flushAsync();

    expect(mockClient.checkBranchExists).toHaveBeenCalled();
    expect(mockClient.createPR).not.toHaveBeenCalled();
    expect(mockClient.checkMergeConflicts).toHaveBeenCalledWith('PROJ', 'my-repo', 0);
    expect(mockStorage.saveHistory).not.toHaveBeenCalled();
    expect(mockStorage.logUsage).not.toHaveBeenCalled();
    expect(mockFinished).toBe(true);
    expect(mockProgressEvents.some((e: any) => e.message.includes('[DRY RUN] Would create PR'))).toBe(true);
    expect(mockProgressEvents.some((e: any) => e.message.includes('Dry run completed'))).toBe(true);
  });

  it('dry run reports existing PRs without creating new ones', async () => {
    const mockClient = createMockClient({
      findExistingPR: vi.fn().mockResolvedValue({ id: 5, version: 1 }),
    });
    mockStorage.getProvider.mockResolvedValue({ id: 'p1', type: 'bitbucket', token: 'tok' });
    const { ProviderFactory } = await import('../providers/factory');
    (ProviderFactory.create as any).mockReturnValue(mockClient);

    const res = await request(app).post('/api/v1/merge-requests').send({ ...validBody, dryRun: true });
    expect(res.status).toBe(200);
    await flushAsync();

    expect(mockClient.createPR).not.toHaveBeenCalled();
    expect(mockProgressEvents.some((e: any) => e.message.includes('PR already exists'))).toBe(true);
  });

  it('dry run reports branch not found', async () => {
    const mockClient = createMockClient({
      checkBranchExists: vi.fn().mockResolvedValue(false),
    });
    mockStorage.getProvider.mockResolvedValue({ id: 'p1', type: 'bitbucket', token: 'tok' });
    const { ProviderFactory } = await import('../providers/factory');
    (ProviderFactory.create as any).mockReturnValue(mockClient);

    const res = await request(app).post('/api/v1/merge-requests').send({ ...validBody, dryRun: true });
    expect(res.status).toBe(200);
    await flushAsync();

    expect(mockClient.createPR).not.toHaveBeenCalled();
    expect(mockProgressEvents.some((e: any) => e.message.includes('not found, skipping'))).toBe(true);
  });

  it('registers webhook after PR creation when webhookUrl provided', async () => {
    const mockClient = createMockClient();
    mockStorage.getProvider.mockResolvedValue({ id: 'p1', type: 'bitbucket', token: 'tok' });
    const { ProviderFactory } = await import('../providers/factory');
    (ProviderFactory.create as any).mockReturnValue(mockClient);

    const res = await request(app).post('/api/v1/merge-requests').send({
      ...validBody,
      webhookUrl: 'https://hooks.example.com/hook',
      webhookEvents: ['pr:merged', 'pr:updated'],
    });
    expect(res.status).toBe(200);
    await flushAsync();

    expect(mockClient.registerWebhook).toHaveBeenCalledWith(
      'PROJ', 'my-repo', 'https://hooks.example.com/hook', ['pr:merged', 'pr:updated'],
    );
    expect(mockProgressEvents.some((e: any) => e.message === 'Webhook registered')).toBe(true);
  });

  it('handles webhook registration failure gracefully', async () => {
    const mockClient = createMockClient({
      registerWebhook: vi.fn().mockRejectedValue(new Error('Network error')),
    });
    mockStorage.getProvider.mockResolvedValue({ id: 'p1', type: 'bitbucket', token: 'tok' });
    const { ProviderFactory } = await import('../providers/factory');
    (ProviderFactory.create as any).mockReturnValue(mockClient);

    const res = await request(app).post('/api/v1/merge-requests').send({
      ...validBody,
      webhookUrl: 'https://hooks.example.com/hook',
    });
    expect(res.status).toBe(200);
    await flushAsync();

    expect(mockProgressEvents.some((e: any) => e.message.includes('Webhook registration failed'))).toBe(true);
  });

  it('rejects webhook registration on free plan with 403', async () => {
    currentPlan = 'free';
    mockStorage.getProvider.mockResolvedValue({ id: 'p1', type: 'bitbucket', token: 'tok' });
    const { ProviderFactory } = await import('../providers/factory');
    (ProviderFactory.create as any).mockReturnValue(createMockClient());

    const res = await request(app).post('/api/v1/merge-requests').send({
      ...validBody,
      webhookUrl: 'https://hooks.example.com/hook',
      webhookEvents: ['pr:merged'],
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Webhook registration is available on Pro and higher plans.');
    expect(mockStorage.saveHistory).not.toHaveBeenCalled();
  });

  it('handles auto-merge when autoMerge=true and no conflicts', async () => {
    const mockClient = createMockClient();
    mockStorage.getProvider.mockResolvedValue({ id: 'p1', type: 'bitbucket', token: 'tok' });
    const { ProviderFactory } = await import('../providers/factory');
    (ProviderFactory.create as any).mockReturnValue(mockClient);

    const res = await request(app).post('/api/v1/merge-requests').send({
      ...validBody,
      autoMerge: true,
      strategy: 'squash',
    });
    expect(res.status).toBe(200);
    await flushAsync();

    expect(mockClient.mergePR).toHaveBeenCalledWith('PROJ', 'my-repo', 1, 1, 'squash');
    expect(mockProgressEvents.some((e: any) => e.message.includes('merged successfully'))).toBe(true);
  });

  it('handles merge conflicts by adding reviewer', async () => {
    const mockClient = createMockClient({
      checkMergeConflicts: vi.fn().mockResolvedValue({ canMerge: false, conflicted: true }),
    });
    mockStorage.getProvider.mockResolvedValue({ id: 'p1', type: 'bitbucket', token: 'tok' });
    const { ProviderFactory } = await import('../providers/factory');
    (ProviderFactory.create as any).mockReturnValue(mockClient);

    const res = await request(app).post('/api/v1/merge-requests').send(validBody);
    expect(res.status).toBe(200);
    await flushAsync();

    expect(mockClient.addReviewer).toHaveBeenCalled();
    expect(mockProgressEvents.some((e: any) => e.message.includes('Conflicts detected, added reviewer'))).toBe(true);
  });

  it('processes multiple branches', async () => {
    const mockClient = createMockClient();
    mockStorage.getProvider.mockResolvedValue({ id: 'p1', type: 'bitbucket', token: 'tok' });
    const { ProviderFactory } = await import('../providers/factory');
    (ProviderFactory.create as any).mockReturnValue(mockClient);

    const res = await request(app).post('/api/v1/merge-requests').send({
      ...validBody,
      branches: ['feature/a', 'feature/b', 'feature/c'],
    });
    expect(res.status).toBe(200);
    await flushAsync();

    expect(mockClient.createPR).toHaveBeenCalledTimes(3);
  });
});
