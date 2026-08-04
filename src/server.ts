import * as dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { config } from './config';
import { logger } from './logger';

const server = app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`);
  logger.info(`Health: http://localhost:${config.PORT}/health`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`Storage: ${config.STORAGE_TYPE}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => process.exit(0));
});

export default server;
