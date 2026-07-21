import app from './app';
import { config } from './config';
import { logger } from './logger';

const server = app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`);
});

export default server;
