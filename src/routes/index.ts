import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import healthRouter from './health';
import mergeRequestsRouter from './merge-requests';
import mergeRequestsV2Router from './merge-requests-v2';
import webhooksRouter from './webhooks';
import providersRouter from './providers';
import historyRouter from './history';
import templatesRouter from './templates';
import logsRouter from './logs';
import settingsRouter from './settings';
import progressRouter from './progress';
import authRouter from './auth';
import billingRouter from './billing';

const v1Router = Router();

v1Router.use('/auth', authRouter);
v1Router.use('/progress', progressRouter);
v1Router.use(authenticate);
v1Router.use('/merge-requests', mergeRequestsV2Router);
v1Router.use('/providers', providersRouter);
v1Router.use('/history', historyRouter);
v1Router.use('/templates', templatesRouter);
v1Router.use('/logs', logsRouter);
v1Router.use('/settings', settingsRouter);
v1Router.use('/webhooks', webhooksRouter);

const apiRouter = Router();

apiRouter.use('/merge-requests', mergeRequestsRouter);
apiRouter.use('/webhooks', webhooksRouter);
apiRouter.use('/v1', v1Router);
apiRouter.use('/billing', billingRouter);

const router = Router();

router.use('/health', healthRouter);
router.use('/api', apiRouter);
router.use('/webhook', webhooksRouter);

export default router;
