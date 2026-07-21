import { Router, Request, Response } from 'express';
import { getStorageProvider } from '../storage/factory';
import { config } from '../config';

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: any) => fn(req, res).catch(next);
}

const router = Router();

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const storage = await getStorageProvider();
  const settings = await storage.getSettings();
  res.json(settings);
}));

router.put('/', asyncHandler(async (req: Request, res: Response) => {
  const storage = await getStorageProvider();
  await storage.saveSettings(req.body);
  res.json({ ok: true });
}));

router.get('/storage-type', asyncHandler(async (_req: Request, res: Response) => {
  res.json({ type: config.STORAGE_TYPE });
}));

export default router;
