import { createAdapter } from '@socket.io/redis-adapter';
import type { Server as SocketIOServer } from 'socket.io';
import { createClient, type RedisClientType } from 'redis';

import { env } from '../config/env';

let pubClient: RedisClientType | null = null;
let subClient: RedisClientType | null = null;

export const attachRedisAdapter = async (io: SocketIOServer): Promise<void> => {
  pubClient = createClient({ url: env.redisUrl });
  subClient = pubClient.duplicate();

  pubClient.on('error', (error) => {
    console.error('Redis publisher error', error);
  });

  subClient.on('error', (error) => {
    console.error('Redis subscriber error', error);
  });

  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createAdapter(pubClient, subClient));
};

export const pingRedis = async (): Promise<'ok' | 'error'> => {
  if (!pubClient?.isOpen) {
    return 'error';
  }

  try {
    await pubClient.ping();
    return 'ok';
  } catch {
    return 'error';
  }
};
