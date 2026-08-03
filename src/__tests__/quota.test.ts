import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { quotaProviders, quotaMR } from '../middleware/quota';
import { requireFeature } from '../middleware/plan-gates';
import { PLAN_LIMITS, getPlanLimits } from '../plans';
import { errorHandler } from '../middleware/error-handler';

const mockState = vi.hoisted(() => ({
  providers: [] as any[],
  usageCount: 0,
}));

vi.mock('../storage/factory', () => ({
  getStorageProvider: vi.fn().mockResolvedValue({
    getProviders: vi.fn(async () => mockState.providers),
    getUsageCount: vi.fn(async () => mockState.usageCount),
  }),
}));

vi.mock('../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'u1', email: 'a@b.c', role: 'operator', plan: 'free' };
    next();
  },
  signToken: vi.fn(() => 'test-token'),
}));

function appWithUser(user: any, mw: any) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = user;
    next();
  });
  app.post('/x', mw, (_req: any, res: any) => res.status(200).json({ ok: true }));
  app.use(errorHandler);
  return app;
}

function makeUser(plan: string) {
  return { userId: 'u1', email: 'a@b.c', role: 'operator', plan };
}

describe('PLAN_LIMITS', () => {
  it('defines limits per the pricing table', () => {
    expect(PLAN_LIMITS.free).toEqual({ providers: 1, mrPerMonth: 3, historyDays: 7, templates: false, webhooks: false });
    expect(PLAN_LIMITS.pro).toEqual({ providers: 5, mrPerMonth: 100, historyDays: 90, templates: true, webhooks: true });
    expect(PLAN_LIMITS.business).toMatchObject({ providers: Infinity, mrPerMonth: 1000, historyDays: Infinity });
    expect(PLAN_LIMITS['self-hosted'].providers).toBe(Infinity);
    expect(PLAN_LIMITS['self-hosted'].mrPerMonth).toBe(Infinity);
  });

  it('falls back to free for unknown plans', () => {
    expect(getPlanLimits('unknown')).toBe(PLAN_LIMITS.free);
  });
});

describe('quotaProviders', () => {
  beforeEach(() => {
    mockState.providers = [];
  });

  it('allows a free plan provider when under the limit', async () => {
    mockState.providers = [];
    const app = appWithUser(makeUser('free'), quotaProviders);
    const res = await request(app).post('/x');
    expect(res.status).toBe(200);
  });

  it('rejects a free plan when provider limit reached with 402', async () => {
    mockState.providers = [{ id: 'p1' }];
    const app = appWithUser(makeUser('free'), quotaProviders);
    const res = await request(app).post('/x');
    expect(res.status).toBe(402);
    expect(res.body.error).toBe('Provider limit reached');
  });

  it('allows a pro plan up to 5 providers', async () => {
    mockState.providers = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}` }));
    const app = appWithUser(makeUser('pro'), quotaProviders);
    const res = await request(app).post('/x');
    expect(res.status).toBe(200);
  });

  it('rejects a pro plan at 5 providers with 402', async () => {
    mockState.providers = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}` }));
    const app = appWithUser(makeUser('pro'), quotaProviders);
    const res = await request(app).post('/x');
    expect(res.status).toBe(402);
  });

  it('allows unlimited providers for business and self-hosted', async () => {
    mockState.providers = Array.from({ length: 50 }, (_, i) => ({ id: `p${i}` }));
    for (const plan of ['business', 'self-hosted']) {
      const app = appWithUser(makeUser(plan), quotaProviders);
      const res = await request(app).post('/x');
      expect(res.status).toBe(200);
    }
  });

  it('returns 401 when no user', async () => {
    const app = appWithUser(undefined, quotaProviders);
    const res = await request(app).post('/x');
    expect(res.status).toBe(401);
  });
});

describe('quotaMR', () => {
  beforeEach(() => {
    mockState.usageCount = 0;
  });

  it('allows free plan under monthly MR limit', async () => {
    mockState.usageCount = 2;
    const app = appWithUser(makeUser('free'), quotaMR);
    const res = await request(app).post('/x');
    expect(res.status).toBe(200);
  });

  it('rejects free plan at monthly MR limit with 402', async () => {
    mockState.usageCount = 3;
    const app = appWithUser(makeUser('free'), quotaMR);
    const res = await request(app).post('/x');
    expect(res.status).toBe(402);
    expect(res.body.error).toBe('Monthly MR limit reached');
    expect(res.body.resetDate).toBeDefined();
  });

  it('allows unlimited MRs for self-hosted', async () => {
    mockState.usageCount = 10000;
    const app = appWithUser(makeUser('self-hosted'), quotaMR);
    const res = await request(app).post('/x');
    expect(res.status).toBe(200);
  });

  it('returns 401 when no user', async () => {
    const app = appWithUser(undefined, quotaMR);
    const res = await request(app).post('/x');
    expect(res.status).toBe(401);
  });
});

describe('requireFeature', () => {
  it('blocks templates on free plan with 403', async () => {
    const app = appWithUser(makeUser('free'), requireFeature('templates'));
    const res = await request(app).post('/x');
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Pro');
  });

  it('blocks webhooks on free plan with 403', async () => {
    const app = appWithUser(makeUser('free'), requireFeature('webhooks'));
    const res = await request(app).post('/x');
    expect(res.status).toBe(403);
  });

  it('allows templates and webhooks on pro and higher', async () => {
    for (const plan of ['pro', 'business', 'self-hosted']) {
      for (const feature of ['templates', 'webhooks'] as const) {
        const app = appWithUser(makeUser(plan), requireFeature(feature));
        const res = await request(app).post('/x');
        expect(res.status).toBe(200);
      }
    }
  });

  it('returns 401 when no user', async () => {
    const app = appWithUser(undefined, requireFeature('templates'));
    const res = await request(app).post('/x');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/usage', () => {
  beforeEach(() => {
    mockState.providers = [];
    mockState.usageCount = 0;
  });

  it('returns plan, limits and reset date for free plan', { timeout: 20000 }, async () => {
    mockState.usageCount = 1;
    mockState.providers = [{ id: 'p1' }];
    const { default: authRouter } = await import('../routes/auth');
    const app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRouter);
    app.use(errorHandler);

    const res = await request(app).get('/api/v1/auth/usage');
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
    expect(res.body.providers).toEqual({ current: 1, limit: 1 });
    expect(res.body.mr).toEqual({ current: 1, limit: 3 });
    expect(res.body.limits.templates).toBe(false);
    expect(res.body.limits.webhooks).toBe(false);
    expect(res.body.limits.historyDays).toBe(7);
    expect(res.body.resetDate).toBeDefined();
  });
});
