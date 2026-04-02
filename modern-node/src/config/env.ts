import dotenv from 'dotenv';

dotenv.config();

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: toNumber(process.env.API_PORT, 4000),
  postgresUrl:
    process.env.POSTGRES_URL ??
    `postgresql://${process.env.POSTGRES_USER ?? 'insights_user'}:${process.env.POSTGRES_PASSWORD ?? 'insights_password'}@${process.env.POSTGRES_HOST ?? 'postgres'}:${process.env.POSTGRES_PORT ?? '5432'}/${process.env.POSTGRES_DB ?? 'realtime_insights'}`,
  redisUrl: process.env.REDIS_URL ?? `redis://${process.env.REDIS_HOST ?? 'redis'}:${process.env.REDIS_PORT ?? '6379'}`,
  legacySyncUrl: process.env.LEGACY_SYNC_URL ?? 'http://legacy-yii:8080',
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  socketPath: process.env.SOCKET_IO_PATH ?? '/socket.io',
  videoTokenSecret: process.env.VIDEO_TOKEN_SECRET ?? 'replace-me',
  trustProxy: toBoolean(process.env.TRUST_PROXY, true),
  defaultSessionId: toNumber(process.env.DEFAULT_SESSION_ID, 1),
};
