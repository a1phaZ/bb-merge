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
