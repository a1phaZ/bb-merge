import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { AppError } from '../middleware/error-handler';

const LOG_DIR = path.resolve('logs');

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: any) => fn(req, res).catch(next);
}

const router = Router();

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  if (!fs.existsSync(LOG_DIR)) {
    res.json({ files: [] });
    return;
  }

  const files = fs.readdirSync(LOG_DIR)
    .filter(f => f.endsWith('.log'))
    .map(f => {
      const stat = fs.statSync(path.join(LOG_DIR, f));
      return {
        name: f,
        size: stat.size,
        createdAt: stat.birthtime.toISOString(),
        modifiedAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

  res.json({ files });
}));

router.get('/tail', (req: Request, res: Response) => {
  const filename = path.basename(req.query.file as string || '');
  const filepath = path.join(LOG_DIR, filename);

  if (!filename.endsWith('.log') || !fs.existsSync(filepath)) {
    res.status(404).json({ error: 'Log file not found' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  try {
    let fileSize = fs.statSync(filepath).size;
    const initial = fs.readFileSync(filepath, 'utf8');
    res.write(`data: ${JSON.stringify({ type: 'init', content: initial })}\n\n`);

    let watcherActive = true;
    const watcher = fs.watch(filepath, (eventType) => {
      if (!watcherActive || eventType !== 'change') return;
      try {
        const stat = fs.statSync(filepath);
        if (stat.size > fileSize) {
          const fd = fs.openSync(filepath, 'r');
          const buf = Buffer.alloc(stat.size - fileSize);
          fs.readSync(fd, buf, 0, buf.length, fileSize);
          fs.closeSync(fd);
          fileSize = stat.size;
          const content = buf.toString('utf8');
          res.write(`data: ${JSON.stringify({ type: 'line', content })}\n\n`);
        }
      } catch {
        res.write(`data: ${JSON.stringify({ type: 'error', content: 'Error reading log file' })}\n\n`);
        watcherActive = false;
        watcher.close();
        res.end();
      }
    });

    req.on('close', () => {
      watcherActive = false;
      watcher.close();
    });
  } catch {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', content: 'Failed to initialize log streaming' })}\n\n`);
      res.end();
    }
  }
});

router.get('/:filename', asyncHandler(async (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filepath = path.join(LOG_DIR, filename);

  if (!filename.endsWith('.log') || !fs.existsSync(filepath)) {
    throw new AppError(404, 'Log file not found');
  }

  const content = fs.readFileSync(filepath, 'utf8');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(content);
}));

router.delete('/', asyncHandler(async (_req: Request, res: Response) => {
  if (fs.existsSync(LOG_DIR)) {
    const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.log'));
    for (const f of files) {
      fs.unlinkSync(path.join(LOG_DIR, f));
    }
  }
  res.json({ ok: true });
}));

export default router;
