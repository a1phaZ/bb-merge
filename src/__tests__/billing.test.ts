import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { errorHandler } from '../middleware/error-handler';

const JWT_SECRET = 'dev-secret-change-in-production';

const mockUsers: Record<string, any> = {};

const mockStorage = {
  getUser: vi.fn(),
  getUsers: vi.fn(),
  saveUser: vi.fn(),
  getUserByEmail: vi.fn(),
};

vi.mock('../storage/factory', () => ({
  getStorageProvider: vi.fn(() => Promise.resolve(mockStorage)),
}));

vi.mock('../yookassa', () => ({
  isBillingConfigured: vi.fn(() => true),
  createPayment: vi.fn(),
  getPayment: vi.fn(),
}));

let app: express.Express;

function token(user: any): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, plan: user.plan },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

const baseUser = {
  id: 'u1',
  email: 'user@test.dev',
  passwordHash: 'hash',
  displayName: 'User',
  role: 'operator',
  plan: 'free',
  authProvider: 'local',
  createdAt: '2026-07-01T00:00:00Z',
};

beforeAll(async () => {
  const router = (await import('../routes/billing')).default;
  app = express();
  app.use(express.json());
  app.use('/api/billing', router);
  app.use(errorHandler);
});

beforeEach(() => {
  Object.keys(mockUsers).forEach(k => delete mockUsers[k]);
  mockUsers.u1 = { ...baseUser };
  mockStorage.getUser.mockReset();
  mockStorage.getUser.mockImplementation(async (id: string) => mockUsers[id] || null);
  mockStorage.getUsers.mockReset();
  mockStorage.getUsers.mockImplementation(async () => Object.values(mockUsers));
  mockStorage.saveUser.mockReset();
  mockStorage.saveUser.mockImplementation(async (u: any) => {
    mockUsers[u.id] = u;
  });
  vi.clearAllMocks();
});

describe('POST /api/billing/checkout', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/billing/checkout').send({ plan: 'pro' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid plan', async () => {
    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token(baseUser)}`)
      .send({ plan: 'enterprise' });
    expect(res.status).toBe(400);
  });

  it('creates a payment and returns confirmation url and payment id', async () => {
    const { createPayment } = await import('../yookassa');
    (createPayment as any).mockResolvedValue({
      id: 'pay_123',
      confirmation: { confirmation_url: 'https://yoomoney.ru/checkout/pay_123' },
    });

    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token(baseUser)}`)
      .send({ plan: 'pro' });

    expect(res.status).toBe(200);
    expect(res.body.confirmationUrl).toBe('https://yoomoney.ru/checkout/pay_123');
    expect(res.body.paymentId).toBe('pay_123');
    expect(createPayment).toHaveBeenCalledWith(expect.objectContaining({
      amount: 990,
      savePaymentMethod: true,
      metadata: { userId: 'u1', plan: 'pro' },
    }));
  });

  it('uses business price for business plan', async () => {
    const { createPayment } = await import('../yookassa');
    (createPayment as any).mockResolvedValue({
      id: 'pay_b',
      confirmation: { confirmation_url: 'https://yoomoney.ru/checkout/pay_b' },
    });

    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token(baseUser)}`)
      .send({ plan: 'business' });

    expect(res.status).toBe(200);
    expect(createPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: 2990 }));
  });

  it('returns 409 when already subscribed to the plan', async () => {
    mockUsers.u1 = {
      ...baseUser,
      plan: 'pro',
      subscription: { plan: 'pro', status: 'active', provider: 'yookassa', currentPeriodEnd: '2026-09-01T00:00:00Z' },
    };
    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token(mockUsers.u1)}`)
      .send({ plan: 'pro' });
    expect(res.status).toBe(409);
  });

  it('returns 503 when billing is not configured', async () => {
    const { isBillingConfigured } = await import('../yookassa');
    (isBillingConfigured as any).mockReturnValueOnce(false);
    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token(baseUser)}`)
      .send({ plan: 'pro' });
    expect(res.status).toBe(503);
  });
});

describe('GET /api/billing/confirm', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/billing/confirm?paymentId=pay_123');
    expect(res.status).toBe(401);
  });

  it('returns 400 when paymentId is missing', async () => {
    const res = await request(app)
      .get('/api/billing/confirm')
      .set('Authorization', `Bearer ${token(baseUser)}`);
    expect(res.status).toBe(400);
  });

  it('returns 400 when payment has not succeeded', async () => {
    const { getPayment } = await import('../yookassa');
    (getPayment as any).mockResolvedValue({ id: 'pay_123', status: 'pending' });

    const res = await request(app)
      .get('/api/billing/confirm?paymentId=pay_123')
      .set('Authorization', `Bearer ${token(baseUser)}`);
    expect(res.status).toBe(400);
  });

  it('upgrades the plan and returns a fresh token', async () => {
    const { getPayment } = await import('../yookassa');
    (getPayment as any).mockResolvedValue({
      id: 'pay_123',
      status: 'succeeded',
      paid_at: '2026-08-01T00:00:00Z',
      payment_method: { id: 'pm_1', saved: true },
      metadata: { userId: 'u1', plan: 'pro' },
    });

    const res = await request(app)
      .get('/api/billing/confirm?paymentId=pay_123')
      .set('Authorization', `Bearer ${token(baseUser)}`);

    expect(res.status).toBe(200);
    expect(res.body.user.plan).toBe('pro');
    expect(res.body.user.subscription.status).toBe('active');
    expect(res.body.user.subscription.paymentMethodId).toBe('pm_1');
    expect(res.body.token).toBeTruthy();

    const payload = jwt.decode(res.body.token) as any;
    expect(payload.plan).toBe('pro');
    expect(mockUsers.u1.plan).toBe('pro');
  });
});

describe('POST /api/billing/cancel', () => {
  it('cancels an active subscription but keeps plan until period end', async () => {
    mockUsers.u1 = {
      ...baseUser,
      plan: 'pro',
      subscription: { plan: 'pro', status: 'active', provider: 'yookassa', currentPeriodEnd: '2026-09-01T00:00:00Z' },
    };

    const res = await request(app)
      .post('/api/billing/cancel')
      .set('Authorization', `Bearer ${token(mockUsers.u1)}`);

    expect(res.status).toBe(200);
    expect(res.body.subscription.status).toBe('canceled');
    expect(res.body.subscription.canceledAt).toBeTruthy();
    expect(mockUsers.u1.plan).toBe('pro');
  });

  it('returns 400 when there is no active subscription', async () => {
    const res = await request(app)
      .post('/api/billing/cancel')
      .set('Authorization', `Bearer ${token(baseUser)}`);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/billing/webhook', () => {
  it('applies plan upgrade on payment.succeeded', async () => {
    const { getPayment } = await import('../yookassa');
    (getPayment as any).mockResolvedValue({
      id: 'pay_123',
      status: 'succeeded',
      paid_at: '2026-08-01T00:00:00Z',
      payment_method: { id: 'pm_1' },
      metadata: { userId: 'u1', plan: 'business' },
    });

    const res = await request(app)
      .post('/api/billing/webhook')
      .send({ event: 'payment.succeeded', object: { id: 'pay_123' } });

    expect(res.status).toBe(200);
    expect(mockUsers.u1.plan).toBe('business');
    expect(mockUsers.u1.subscription.lastPaymentId).toBe('pay_123');
  });

  it('is idempotent for duplicate webhooks', async () => {
    const { getPayment } = await import('../yookassa');
    (getPayment as any).mockResolvedValue({
      id: 'pay_123',
      status: 'succeeded',
      paid_at: '2026-08-01T00:00:00Z',
      payment_method: { id: 'pm_1' },
      metadata: { userId: 'u1', plan: 'pro' },
    });

    await request(app).post('/api/billing/webhook').send({ event: 'payment.succeeded', object: { id: 'pay_123' } });
    await request(app).post('/api/billing/webhook').send({ event: 'payment.succeeded', object: { id: 'pay_123' } });

    expect(mockUsers.u1.subscription.lastPaymentId).toBe('pay_123');
  });

  it('ignores non-succeeded payments', async () => {
    const { getPayment } = await import('../yookassa');
    (getPayment as any).mockResolvedValue({ id: 'pay_123', status: 'pending' });

    const res = await request(app)
      .post('/api/billing/webhook')
      .send({ event: 'payment.succeeded', object: { id: 'pay_123' } });

    expect(res.status).toBe(200);
    expect(mockUsers.u1.plan).toBe('free');
  });

  it('returns 400 when payment id is missing', async () => {
    const res = await request(app).post('/api/billing/webhook').send({ event: 'payment.succeeded' });
    expect(res.status).toBe(400);
  });
});

describe('runBillingCycle', () => {
  function sub(overrides: any) {
    return {
      plan: 'pro',
      status: 'active',
      provider: 'yookassa',
      paymentMethodId: 'pm_1',
      currentPeriodEnd: '2026-07-01T00:00:00Z',
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.resetModules();
  });

  it('renews an active subscription via autopay after period end', async () => {
    const { createPayment } = await import('../yookassa');
    (createPayment as any).mockResolvedValue({
      id: 'pay_renew',
      status: 'succeeded',
      paid_at: '2026-08-01T00:00:00Z',
      payment_method: { id: 'pm_1' },
      metadata: { userId: 'u1', plan: 'pro' },
    });

    mockUsers.u1 = { ...baseUser, plan: 'pro', subscription: sub({}) };

    const { runBillingCycle } = await import('../billing');
    const processed = await runBillingCycle();

    expect(processed).toBe(1);
    expect(createPayment).toHaveBeenCalledWith(expect.objectContaining({
      amount: 990,
      paymentMethodId: 'pm_1',
      metadata: { userId: 'u1', plan: 'pro' },
    }));
    expect(mockUsers.u1.plan).toBe('pro');
    expect(mockUsers.u1.subscription.status).toBe('active');
  });

  it('marks a subscription past_due when the autopay fails', async () => {
    const { createPayment } = await import('../yookassa');
    (createPayment as any).mockRejectedValue(new Error('Insufficient funds'));

    mockUsers.u1 = { ...baseUser, plan: 'pro', subscription: sub({}) };

    const { runBillingCycle } = await import('../billing');
    await runBillingCycle();

    expect(mockUsers.u1.subscription.status).toBe('past_due');
    expect(mockUsers.u1.subscription.retryCount).toBe(1);
    expect(mockUsers.u1.plan).toBe('pro');
  });

  it('downgrades to free after max retries', async () => {
    const { createPayment } = await import('../yookassa');
    (createPayment as any).mockRejectedValue(new Error('Insufficient funds'));

    mockUsers.u1 = { ...baseUser, plan: 'pro', subscription: sub({ retryCount: 2 }) };

    const { runBillingCycle } = await import('../billing');
    await runBillingCycle();

    expect(mockUsers.u1.plan).toBe('free');
    expect(mockUsers.u1.subscription.status).toBe('canceled');
    expect(mockUsers.u1.subscription.canceledAt).toBeTruthy();
  });

  it('downgrades to free when there is no saved payment method', async () => {
    mockUsers.u1 = { ...baseUser, plan: 'pro', subscription: sub({ paymentMethodId: undefined }) };

    const { runBillingCycle } = await import('../billing');
    await runBillingCycle();

    expect(mockUsers.u1.plan).toBe('free');
  });

  it('skips subscriptions that are still within the current period', async () => {
    mockUsers.u1 = {
      ...baseUser,
      plan: 'pro',
      subscription: sub({ currentPeriodEnd: new Date(Date.now() + 86400000).toISOString() }),
    };

    const { runBillingCycle } = await import('../billing');
    const processed = await runBillingCycle();

    expect(processed).toBe(0);
    expect(mockUsers.u1.plan).toBe('pro');
  });

  it('skips canceled subscriptions', async () => {
    mockUsers.u1 = { ...baseUser, plan: 'free', subscription: sub({ status: 'canceled', plan: 'pro' }) };

    const { runBillingCycle } = await import('../billing');
    const processed = await runBillingCycle();

    expect(processed).toBe(0);
  });

  it('returns 0 when billing is not configured', async () => {
    const { isBillingConfigured } = await import('../yookassa');
    (isBillingConfigured as any).mockReturnValueOnce(false);
    mockUsers.u1 = { ...baseUser, plan: 'pro', subscription: sub({}) };

    const { runBillingCycle } = await import('../billing');
    const processed = await runBillingCycle();

    expect(processed).toBe(0);
    expect(mockUsers.u1.plan).toBe('pro');
  });
});
