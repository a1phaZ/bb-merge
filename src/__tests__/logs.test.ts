import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import logsRouter from '../routes/logs';
import { errorHandler } from '../middleware/error-handler';

const LOG_DIR = path.resolve('logs');
const testLogPath = path.join(LOG_DIR, 'test.log');

function createApp() {
  const app = express();
  app.use('/api/v1/logs', logsRouter);
  app.use(errorHandler);
  return app;
}

describe('Logs API', () => {
  beforeEach(() => {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.writeFileSync(testLogPath, '2026-01-01 INFO Test log entry\n', 'utf8');
  });

  afterEach(() => {
    try { fs.unlinkSync(testLogPath); } catch {}
  });

  it('lists log files', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/logs');
    expect(res.status).toBe(200);
    expect(res.body.files.some((f: any) => f.name === 'test.log')).toBe(true);
  });

  it('returns log file content', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/logs/test.log');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Test log entry');
  });

  it('returns 404 for non-existent log file', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/logs/nonexistent.log');
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent log file on tail', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/logs/tail?file=nonexistent.log');
    expect(res.status).toBe(404);
  });

  it('returns SSE headers for tail endpoint', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address() as any;
    await new Promise<void>((resolve) => {
      const req = http.get(`http://127.0.0.1:${addr.port}/api/v1/logs/tail?file=test.log`, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/event-stream');
        expect(res.headers['cache-control']).toContain('no-cache');
        res.destroy();
        server.close();
        resolve();
      });
      req.on('error', () => { server.close(); resolve(); });
    });
  });

  it('tail endpoint returns initial content as SSE event', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address() as any;
    await new Promise<void>((resolve) => {
      const req = http.get(`http://127.0.0.1:${addr.port}/api/v1/logs/tail?file=test.log`, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
          if (data.includes('Test log entry')) {
            expect(data).toContain('data:');
            res.destroy();
            server.close();
            resolve();
          }
        });
        res.on('end', () => { server.close(); resolve(); });
      });
      req.on('error', () => { server.close(); resolve(); });
    });
  });

  it('tail endpoint prevents path traversal', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/logs/tail?file=../config.ts');
    expect(res.status).toBe(404);
  });

  it('deletes all log files', async () => {
    const app = createApp();
    const res = await request(app).delete('/api/v1/logs');
    expect(res.status).toBe(200);
    expect(fs.existsSync(testLogPath)).toBe(false);
  });
});
