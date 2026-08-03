import * as dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { config } from './config';
import { logger } from './logger';
import { runBillingCycle } from './billing';

const BILLING_INTERVAL_MS = 60 * 60 * 1000;

const server = app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`);
  logger.info(`Health: http://localhost:${config.PORT}/health`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`Storage: ${config.STORAGE_TYPE}`);
});

const billingTimer = setInterval(async () => {
  try {
    const processed = await runBillingCycle();
    if (processed > 0) logger.info(`Billing cycle processed ${processed} subscription(s)`);
  } catch (err) {
    logger.error('Billing cycle failed', { error: (err as Error).message });
  }
}, BILLING_INTERVAL_MS);
billingTimer.unref();

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  clearInterval(billingTimer);
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  clearInterval(billingTimer);
  server.close(() => process.exit(0));
});

export default server;
