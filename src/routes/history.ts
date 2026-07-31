import { Router, Request, Response } from 'express';
import { getStorageProvider } from '../storage/factory';
import { getPlanLimits } from '../plans';

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: any) => fn(req, res).catch(next);
}

const router = Router();

function historyMaxAgeDays(req: Request): number | undefined {
  if (!req.user) return undefined;
  const days = getPlanLimits(req.user.plan).historyDays;
  return Number.isFinite(days) ? days : undefined;
}

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const storage = await getStorageProvider();
  const { page, limit, providerId, search } = req.query as Record<string, string>;
  const result = await storage.getHistory({
    page: page ? parseInt(page) : undefined,
    limit: limit ? parseInt(limit) : undefined,
    providerId,
    search,
    maxAgeDays: historyMaxAgeDays(req),
  });
  res.json(result);
}));

router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const storage = await getStorageProvider();
  const days = req.query.days ? parseInt(req.query.days as string) : 30;
  if (isNaN(days) || days < 1 || days > 365) {
    res.status(400).json({ error: 'days must be between 1 and 365' });
    return;
  }
  const maxAge = historyMaxAgeDays(req);
  const stats = await storage.getHistoryStats(maxAge && days > maxAge ? maxAge : days);
  res.json(stats);
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const storage = await getStorageProvider();
  const item = await storage.getHistoryItem(req.params.id, historyMaxAgeDays(req));
  if (!item) {
    res.status(404).json({ error: 'History record not found' });
    return;
  }
  res.json(item);
}));

router.delete('/', asyncHandler(async (_req: Request, res: Response) => {
  const storage = await getStorageProvider();
  await storage.deleteHistory();
  res.json({ ok: true });
}));

export default router;
