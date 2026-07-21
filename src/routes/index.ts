import { Router } from 'express';
import healthRouter from './health';
import mergeRequestsRouter from './merge-requests';
import webhooksRouter from './webhooks';

const apiRouter = Router();

apiRouter.use('/merge-requests', mergeRequestsRouter);
apiRouter.use('/webhooks', webhooksRouter);

const router = Router();

router.use('/health', healthRouter);
router.use('/api', apiRouter);
router.use('/webhook', webhooksRouter);

export default router;
