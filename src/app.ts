import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { corsMiddleware } from './middleware/cors';
import { apiLimiter } from './middleware/rate-limiter';
import { errorHandler } from './middleware/error-handler';
import routes from './routes';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use('/api', apiLimiter);

app.use(routes);

const publicPath = path.resolve('public', 'browser');
app.use(express.static(publicPath));

app.get('*', (_req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(404).json({ error: 'Not found' });
  });
});

app.use(errorHandler);

export default app;
