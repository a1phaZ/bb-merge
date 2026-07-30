import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

interface ProgressEvent {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  branch?: string;
  prId?: number;
  timestamp: string;
}

interface ProgressSession {
  id: string;
  clients: Response[];
  events: ProgressEvent[];
  done: boolean;
}

const sessions = new Map<string, ProgressSession>();

function removeClient(session: ProgressSession, client: Response) {
  const idx = session.clients.indexOf(client);
  if (idx >= 0) session.clients.splice(idx, 1);
}

export function getOrCreateSession(sessionId?: string): ProgressSession {
  const id = sessionId || uuid();
  if (!sessions.has(id)) {
    sessions.set(id, { id, clients: [], events: [], done: false });
  }
  return sessions.get(id)!;
}

export function addProgressEvent(sessionId: string, event: Omit<ProgressEvent, 'timestamp'>) {
  const session = sessions.get(sessionId);
  if (!session) return;

  const full: ProgressEvent = { ...event, timestamp: new Date().toISOString() };
  session.events.push(full);

  const data = JSON.stringify(full);
  for (const client of session.clients) {
    if (!client.writableEnded) {
      try { client.write(`data: ${data}\n\n`); } catch { removeClient(session, client); }
    }
  }

  if (event.type === 'error') {
    session.done = true;
    for (const client of session.clients) {
      if (!client.writableEnded) {
        try {
          client.write(`data: {"type":"done","timestamp":"${new Date().toISOString()}"}\n\n`);
          client.end();
        } catch { removeClient(session, client); }
      }
    }
  }
}

export function finishProgress(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.done = true;
  for (const client of session.clients) {
    if (!client.writableEnded) {
      try {
        client.write(`data: {"type":"done","timestamp":"${new Date().toISOString()}"}\n\n`);
        client.end();
      } catch { removeClient(session, client); }
    }
  }

  setTimeout(() => sessions.delete(sessionId), 60_000);
}

const router = Router();

router.get('/:sessionId', (req: Request, res: Response) => {
  const session = getOrCreateSession(req.params.sessionId);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  try {
    for (const event of session.events) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    if (session.done) {
      res.write(`data: {"type":"done","timestamp":"${new Date().toISOString()}"}\n\n`);
      res.end();
      return;
    }

    session.clients.push(res);

    res.on('close', () => {
      const idx = session.clients.indexOf(res);
      if (idx >= 0) session.clients.splice(idx, 1);
    });
  } catch {
    res.end();
  }
});

export default router;
