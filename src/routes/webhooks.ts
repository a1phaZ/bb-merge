import { Router, Request, Response } from 'express';
import { getStorageProvider } from '../storage/factory';
import { ProviderFactory } from '../providers/factory';
import { AppError } from '../middleware/error-handler';
import { requireFeature } from '../middleware/plan-gates';
import { logger } from '../logger';
import { validate, webhookRegisterSchema } from '../validation';

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: any) => fn(req, res).catch(next);
}

function headerValue(headers: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = headers[key];
  return Array.isArray(v) ? v[0] : v;
}

const router = Router();

router.post('/bitbucket', asyncHandler(async (req: Request, res: Response) => {
  const event = headerValue(req.headers, 'x-event-key') || 'unknown';
  const payload = req.body;

  logger.info(`Webhook received: ${event}`, { event });

  try {
    const storage = await getStorageProvider();
    await storage.saveWebhookEvent({
      id: Date.now(),
      providerId: 'bitbucket',
      eventType: event,
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

router.post('/register/:providerId', requireFeature('webhooks'), validate(webhookRegisterSchema), asyncHandler(async (req: Request, res: Response) => {
  const storage = await getStorageProvider();
  const provider = await storage.getProvider(req.params.providerId);
  if (!provider) throw new AppError(404, 'Provider not found');

  const { project, repo, url, events } = req.body;
  const client = ProviderFactory.create(provider);
  const result = await client.registerWebhook(project, repo, url, events || []);
  res.status(201).json(result);
}));

const incomingWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const { providerId } = req.params;
  const event = headerValue(req.headers, 'x-event-key')
    || headerValue(req.headers, 'x-github-event')
    || headerValue(req.headers, 'x-gitlab-event')
    || 'unknown';
  const payload = req.body;

  logger.info(`Webhook received for ${providerId}: ${event}`, { providerId, event });

  try {
    const storage = await getStorageProvider();
    await storage.saveWebhookEvent({
      id: Date.now(),
      providerId,
      eventType: event,
      payloadJson: JSON.stringify(payload),
      receivedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('Failed to save webhook event', { error: err.message });
  }

  res.sendStatus(200);
});

router.post('/receive/:providerId', incomingWebhookHandler);

router.post('/:providerId', incomingWebhookHandler);

export default router;
