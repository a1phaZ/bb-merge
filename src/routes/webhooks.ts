import { Router, Request, Response } from 'express';
import { logger } from '../logger';

const router = Router();

router.post('/bitbucket', (req: Request, res: Response) => {
  const event = req.headers['x-event-key'];
  const payload = req.body;

  logger.info(`Webhook received: ${event}`, { event });

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
});

export default router;
