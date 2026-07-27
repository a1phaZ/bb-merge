import { Request, Response, NextFunction } from 'express';
import { getStorageProvider } from '../storage/factory';

const PLAN_LIMITS: Record<string, { providers: number; mrPerMonth: number }> = {
  'free': { providers: 1, mrPerMonth: 3 },
  'pro': { providers: 5, mrPerMonth: 100 },
  'business': { providers: Infinity, mrPerMonth: 1000 },
  'self-hosted': { providers: Infinity, mrPerMonth: Infinity },
};

export async function quotaProviders(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const limit = PLAN_LIMITS[req.user.plan] || PLAN_LIMITS['free'];
  if (limit.providers === Infinity) {
    next();
    return;
  }

  try {
      const storage = await getStorageProvider();
      const providers = await storage.getProviders();
    if (providers.length >= limit.providers) {
      res.status(402).json({
        error: 'Provider limit reached',
        message: `Your plan allows up to ${limit.providers} provider${limit.providers > 1 ? 's' : ''}. Upgrade to add more.`,
        plan: req.user.plan,
        limit: limit.providers,
        current: providers.length,
      });
      return;
    }
    next();
  } catch {
    next();
  }
}

export async function quotaMR(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const limit = PLAN_LIMITS[req.user.plan] || PLAN_LIMITS['free'];
  if (limit.mrPerMonth === Infinity) {
    next();
    return;
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const storage = await getStorageProvider();
    const count = await storage.getUsageCount(req.user.userId, 'create_mr', startOfMonth);

    if (count >= limit.mrPerMonth) {
      res.status(402).json({
        error: 'Monthly MR limit reached',
        message: `Your plan allows ${limit.mrPerMonth} MRs per month. Upgrade to create more.`,
        plan: req.user.plan,
        limit: limit.mrPerMonth,
        current: count,
        resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
      });
      return;
    }
    next();
  } catch {
    next();
  }
}
