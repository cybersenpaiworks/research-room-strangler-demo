import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';

import { env } from './config/env';
import { buildDemoEventMessage } from './lib/demoEvents';
import { buildCorsOptions } from './lib/cors';
import { syncLegacySnapshot } from './lib/legacySync';
import { buildModernSessionSnapshot } from './lib/sessionSnapshot';
import { countDemoEvents, getLatestDemoEvent, insertDemoEvent, insertInsight, listDemoEvents, listInsights, pool } from './lib/postgres';
import { attachRedisAdapter, pingRedis } from './lib/redis';
import { generateVideoToken } from './lib/videoToken';

const app = express();

if (env.trustProxy) {
  app.set('trust proxy', 1);
}

const corsOptions = buildCorsOptions(env.corsAllowedOrigins);
const server = http.createServer(app);
const io = new Server(server, {
  path: env.socketPath,
  cors: corsOptions,
});

app.use(cors(corsOptions));
app.use(express.json());

app.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query('SELECT 1');
    const redis = await pingRedis();

    res.status(redis === 'ok' ? 200 : 503).json({
      status: redis === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        postgres: 'ok',
        redis,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post('/video/token', (req: Request, res: Response) => {
  const sessionId = Number(req.body.sessionId);
  const role = String(req.body.role ?? '').trim();
  const userId = String(req.body.userId ?? 'interviewer@video-room.local').trim();

  if (!Number.isFinite(sessionId) || sessionId <= 0 || !role) {
    res.status(400).json({
      error: 'sessionId and role are required',
    });
    return;
  }

  const token = generateVideoToken({
    sessionId,
    role,
    userId,
    secret: env.videoTokenSecret,
  });

  res.json(token);
});

app.get('/session/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startedAt = Date.now();
    const sessionId = Number(req.params.sessionId);

    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      res.status(400).json({ error: 'Invalid session id' });
      return;
    }

    const latestDemoEvent = await getLatestDemoEvent(sessionId);
    const payload = buildModernSessionSnapshot(sessionId, latestDemoEvent, Date.now() - startedAt);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get('/sessions/:sessionId/insights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = Number(req.params.sessionId);

    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      res.status(400).json({ error: 'Invalid session id' });
      return;
    }

    const insights = await listInsights(sessionId);
    res.json(insights);
  } catch (error) {
    next(error);
  }
});

app.get('/sessions/:sessionId/demo-events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = Number(req.params.sessionId);

    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      res.status(400).json({ error: 'Invalid session id' });
      return;
    }

    const demoEvents = await listDemoEvents(sessionId);
    res.json(demoEvents);
  } catch (error) {
    next(error);
  }
});

app.post('/sessions/:sessionId/insights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const author = String(req.body.author ?? 'Interviewer').trim();
    const message = String(req.body.message ?? '').trim();

    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      res.status(400).json({ error: 'Invalid session id' });
      return;
    }

    if (!message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const insight = await insertInsight(sessionId, author || 'Interviewer', message);
    io.to(`session:${sessionId}`).emit('insight:created', insight);

    res.status(201).json(insight);
  } catch (error) {
    next(error);
  }
});

app.post('/sessions/:sessionId/demo-events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = Number(req.params.sessionId);

    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      res.status(400).json({ error: 'Invalid session id' });
      return;
    }

    const demoEventCount = await countDemoEvents(sessionId);
    const message = buildDemoEventMessage(demoEventCount);
    const demoEvent = await insertDemoEvent(sessionId, message);
    await syncLegacySnapshot(sessionId, message);

    io.to(`session:${sessionId}`).emit('demo:event', demoEvent);
    io.to(`session:${sessionId}`).emit('insight:created', demoEvent);

    res.status(201).json(demoEvent);
  } catch (error) {
    next(error);
  }
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
  });
});

io.on('connection', (socket) => {
  const requestedSessionId = Number(socket.handshake.query.sessionId ?? env.defaultSessionId);
  const sessionId = Number.isFinite(requestedSessionId) && requestedSessionId > 0 ? requestedSessionId : env.defaultSessionId;
  const roomName = `session:${sessionId}`;

  socket.join(roomName);
  socket.emit('connection:ready', {
    socketId: socket.id,
    roomName,
    connectedAt: new Date().toISOString(),
  });
});

const bootstrap = async (): Promise<void> => {
  await pool.query('SELECT 1');
  await attachRedisAdapter(io);

  server.listen(env.port, () => {
    console.log(`Modern API listening on port ${env.port}`);
  });
};

const shutdown = async (): Promise<void> => {
  await pool.end();
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', () => {
  void shutdown();
});

process.on('SIGINT', () => {
  void shutdown();
});

bootstrap().catch((error) => {
  console.error('Failed to bootstrap API', error);
  process.exit(1);
});
