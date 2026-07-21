import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getStorageProvider } from '../storage/factory';
import { AppError } from '../middleware/error-handler';
import { logger } from '../logger';

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: any) => fn(req, res).catch(next);
}

const router = Router();

router.post('/bitbucket', asyncHandler(async (req: Request, res: Response) => {
  const event = req.headers['x-event-key'] as string;
  const payload = req.body;

  logger.info(`Webhook received: ${event}`, { event });

  try {
    const storage = await getStorageProvider();
    await storage.saveWebhookEvent({
      id: Date.now(),
      providerId: 'bitbucket',
      eventType: event || 'unknown',
      payloadJson: JSON.stringify(payload),
      receivedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('Failed to save webhook event', { error: err.message });
  }

  if (event === 'pr:merged' || event === 'pr:updated') {
    const pr = payload.pullRequest;
    if (pr) {
      logger.info(`PR #${pr.id}: ${pr.title}`, {
        prId: pr.id,
        title: pr.title,
        state: pr.state,
        author: pr.author?.user?.displayName || 'Unknown',
      });
    }
  }

  res.sendStatus(200);
}));

router.get('/events', asyncHandler(async (req: Request, res: Response) => {
  const storage = await getStorageProvider();
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const events = await storage.getWebhookEvents(limit);
  res.json(events);
}));

router.delete('/events', asyncHandler(async (_req: Request, res: Response) => {
  const storage = await getStorageProvider();
  await storage.deleteWebhookEvents();
  res.json({ ok: true });
}));

export default router;
